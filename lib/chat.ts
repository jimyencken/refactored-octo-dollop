import { prisma } from "./prisma";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a proactive personal productivity assistant. You help with:
- Scheduling and managing reminders
- Drafting and reviewing messages for business and personal contacts
- Tracking relationships and follow-ups
- Providing daily summaries and availability insights

Be concise, helpful, and proactive. When the user mentions tasks, dates, or people,
offer to create reminders or draft messages. Always be professional yet warm.
Keep responses brief — this is a mobile chat interface.`;

async function buildContext(): Promise<string> {
  try {
    const parts: string[] = [];

    const reminders = await prisma.reminder.findMany({
      where: { status: "pending" },
      orderBy: { dueAt: "asc" },
      take: 10,
    });
    if (reminders.length) {
      const items = reminders.map(
        (r) => `- ${r.title} (due: ${r.dueAt.toISOString().slice(0, 16).replace("T", " ")})`
      );
      parts.push("Upcoming reminders:\n" + items.join("\n"));
    }

    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    if (contacts.length) {
      const items = contacts.map((c) => `- ${c.name} (${c.relationshipType})`);
      parts.push("Recent contacts:\n" + items.join("\n"));
    }

    const draftCount = await prisma.message.count({ where: { status: "draft" } });
    if (draftCount > 0) {
      parts.push(`You have ${draftCount} draft message(s) pending review.`);
    }

    return parts.length ? parts.join("\n\n") : "No current items.";
  } catch {
    return "No current items.";
  }
}

async function callClaude(
  turns: { role: string; content: string }[],
  userMessage: string,
  context: string
): Promise<string> {
  const client = new Anthropic();

  const messages = [
    ...turns.slice(-20).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\nCurrent user context:\n${context}`,
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

function fallbackResponse(userMessage: string, context: string): string {
  const lower = userMessage.toLowerCase();

  if (["remind", "schedule", "task"].some((w) => lower.includes(w))) {
    return `I can help with that! Here's your schedule:\n\n${context}\n\nTo create a reminder, use the Reminders tab or tell me what and when.`;
  }
  if (["draft", "write", "compose", "message", "email"].some((w) => lower.includes(w))) {
    return "I can help draft a message! Tell me:\n- Who is it for?\n- What's the purpose?\n- What tone? (professional, casual, formal)";
  }
  if (["summary", "digest", "overview", "status"].some((w) => lower.includes(w))) {
    return `Here's your overview:\n\n${context}`;
  }
  if (["hello", "hi", "hey"].some((w) => lower.includes(w))) {
    return `Hey! Here's a quick look:\n\n${context}\n\nWhat can I help with?`;
  }
  return `Here's your current context:\n${context}\n\nI can help with reminders, messages, contacts, and scheduling.`;
}

// In-memory conversation store for serverless (no persistent filesystem)
const memoryConvs = new Map<number, { role: string; content: string }[]>();
let nextConvId = 1;

export async function processChat(
  conversationId: number | null,
  userMessage: string
): Promise<{ conversationId: number; reply: string }> {
  // Try DB first, fall back to in-memory for serverless
  let convId = conversationId;
  let pastTurns: { role: string; content: string }[] = [];
  let useDb = false;

  try {
    let conversation;
    if (convId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: convId },
        include: { turns: { orderBy: { createdAt: "asc" } } },
      });
    }
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { title: "New conversation" },
        include: { turns: true },
      });
    }
    convId = conversation.id;
    pastTurns = conversation.turns.map((t) => ({ role: t.role, content: t.content }));
    useDb = true;
  } catch {
    // DB unavailable (serverless/no filesystem) — use in-memory
    if (convId && memoryConvs.has(convId)) {
      pastTurns = memoryConvs.get(convId)!;
    } else {
      convId = nextConvId++;
      memoryConvs.set(convId, []);
      pastTurns = [];
    }
  }

  // Generate response
  const context = await buildContext();
  let reply: string;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      reply = await callClaude(pastTurns, userMessage, context);
    } catch (e) {
      console.warn("Claude API failed:", e);
      reply = fallbackResponse(userMessage, context);
    }
  } else {
    reply = fallbackResponse(userMessage, context);
  }

  // Persist
  if (useDb) {
    try {
      await prisma.conversationTurn.create({
        data: { conversationId: convId!, role: "user", content: userMessage },
      });
      await prisma.conversationTurn.create({
        data: { conversationId: convId!, role: "assistant", content: reply },
      });
    } catch { /* ignore DB write failures */ }
  } else {
    const turns = memoryConvs.get(convId!) || [];
    turns.push({ role: "user", content: userMessage });
    turns.push({ role: "assistant", content: reply });
    memoryConvs.set(convId!, turns);
  }

  return { conversationId: convId!, reply };
}
