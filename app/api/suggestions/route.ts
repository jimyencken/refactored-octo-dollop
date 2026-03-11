import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


interface Suggestion {
  id: string;
  text: string;
  action: string; // "chat" | "navigate" | "create"
  payload?: Record<string, unknown>;
  icon: string; // emoji
  priority: number;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "default-summary",
    text: "Get a daily summary",
    action: "chat",
    payload: { prefill: "Give me a summary of my day" },
    icon: "\u2615",
    priority: 1,
  },
  {
    id: "default-reminder",
    text: "Set a reminder",
    action: "create",
    payload: { type: "reminder" },
    icon: "\u{1f4cc}",
    priority: 1,
  },
];

export async function GET() {
  try {
      const suggestions: Suggestion[] = [];
      const now = new Date();

      // Check overdue reminders
      const overdueReminders = await prisma.reminder.findMany({
        where: { status: "pending", dueAt: { lt: now } },
        orderBy: { dueAt: "asc" },
        take: 10,
      });
      if (overdueReminders.length > 0) {
        suggestions.push({
          id: "overdue-reminders",
          text: `You have ${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? "s" : ""} — triage now?`,
          action: "navigate",
          payload: { page: "reminders", filter: "pending" },
          icon: "\u23f0",
          priority: 10,
        });
      }

      // Check upcoming reminders (next 2 hours)
      const soonReminders = await prisma.reminder.findMany({
        where: {
          status: "pending",
          dueAt: { gte: now, lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
        },
        take: 5,
      });
      if (soonReminders.length > 0) {
        const first = soonReminders[0];
        suggestions.push({
          id: "upcoming-reminder",
          text: `"${first.title}" is due soon`,
          action: "navigate",
          payload: { page: "reminders" },
          icon: "\u{1f4cb}",
          priority: 8,
        });
      }

      // Check contacts needing follow-up
      const contactsNeedingFollowUp = await prisma.contact.findMany({
        where: {
          followUpFrequencyDays: { not: null },
          lastContactDate: { not: null },
        },
        take: 50,
      });
      const staleContacts = contactsNeedingFollowUp.filter((c) => {
        if (!c.lastContactDate || !c.followUpFrequencyDays) return false;
        const daysSince = Math.floor(
          (now.getTime() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince > c.followUpFrequencyDays;
      });
      if (staleContacts.length > 0) {
        const c = staleContacts[0];
        const daysSince = Math.floor(
          (now.getTime() - new Date(c.lastContactDate!).getTime()) / (1000 * 60 * 60 * 24)
        );
        suggestions.push({
          id: `follow-up-${c.id}`,
          text: `Haven't contacted ${c.name} in ${daysSince} days — draft a message?`,
          action: "chat",
          payload: { prefill: `Draft a message to ${c.name}` },
          icon: "\u{1f4ac}",
          priority: 7,
        });
      }

      // Check draft messages needing attention
      const draftCount = await prisma.message.count({ where: { status: "draft" } });
      if (draftCount > 0) {
        suggestions.push({
          id: "pending-drafts",
          text: `${draftCount} draft${draftCount > 1 ? "s" : ""} waiting to send`,
          action: "navigate",
          payload: { page: "messages", filter: "draft" },
          icon: "\u2709\ufe0f",
          priority: 5,
        });
      }

      // Check unread notifications
      const unreadCount = await prisma.notification.count({ where: { isRead: false } });
      if (unreadCount > 0) {
        suggestions.push({
          id: "unread-notifs",
          text: `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`,
          action: "navigate",
          payload: { page: "notifications" },
          icon: "\u{1f514}",
          priority: 4,
        });
      }

      // Default suggestions if nothing contextual
      if (suggestions.length === 0) {
        suggestions.push(
          {
            id: "default-summary",
            text: "Get a daily summary",
            action: "chat",
            payload: { prefill: "Give me a summary of my day" },
            icon: "\u2615",
            priority: 1,
          },
          {
            id: "default-reminder",
            text: "Set a reminder",
            action: "create",
            payload: { type: "reminder" },
            icon: "\u{1f4cc}",
            priority: 1,
          }
        );
      }

      // Sort by priority descending, limit to 5
      suggestions.sort((a, b) => b.priority - a.priority);

    return NextResponse.json(suggestions.slice(0, 5));
  } catch (e) {
    console.error("Suggestions error:", (e as Error).message);
    return NextResponse.json(DEFAULT_SUGGESTIONS);
  }
}
