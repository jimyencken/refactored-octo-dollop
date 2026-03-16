import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  dbInitialized: boolean;
};

function getDatabaseUrl(): string {
  // On Vercel (or any serverless), use /tmp for SQLite
  if (process.env.VERCEL) {
    const tmpDb = "/tmp/dev.db";
    return `file:${tmpDb}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
}

function ensureDatabase() {
  if (globalForPrisma.dbInitialized) return;

  if (process.env.VERCEL) {
    const tmpDb = "/tmp/dev.db";
    if (!fs.existsSync(tmpDb)) {
      // Push schema to /tmp database
      try {
        execSync("npx prisma db push --skip-generate --accept-data-loss", {
          env: { ...process.env, DATABASE_URL: `file:${tmpDb}` },
          cwd: process.cwd(),
          stdio: "pipe",
        });
      } catch (e) {
        console.error("Failed to push schema:", (e as Error).message);
        return; // Don't mark as initialized if schema push failed
      }
    }
  }

  globalForPrisma.dbInitialized = true;
}

// Set DATABASE_URL for Prisma client
if (process.env.VERCEL) {
  process.env.DATABASE_URL = getDatabaseUrl();
}

ensureDatabase();

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Seeds the database with sample data if empty.
 * Called lazily on first API request.
 */
export async function seedIfEmpty() {
  try {
    const count = await prisma.contact.count();
    if (count > 0) return;

    // Seed contacts
    const contacts = await Promise.all([
      prisma.contact.create({
        data: {
          name: "Sarah Chen",
          email: "sarah.chen@acme.com",
          phone: "+61 400 123 456",
          company: "Acme Health",
          relationshipType: "business",
          notes: "Primary contact for Acme Health partnership",
          followUpFrequencyDays: 14,
        },
      }),
      prisma.contact.create({
        data: {
          name: "James Wilson",
          email: "james@wilsontherapy.com.au",
          phone: "+61 412 987 654",
          company: "Wilson Therapy",
          relationshipType: "business",
          notes: "Referred 3 clients last quarter",
          followUpFrequencyDays: 30,
        },
      }),
      prisma.contact.create({
        data: {
          name: "Emma Rodriguez",
          email: "emma.r@gmail.com",
          phone: "+61 423 456 789",
          relationshipType: "personal",
          notes: "Met at APA conference 2025",
        },
      }),
      prisma.contact.create({
        data: {
          name: "Dr. Michael Park",
          email: "m.park@mindwell.com.au",
          phone: "+61 434 567 890",
          company: "MindWell Clinic",
          relationshipType: "business",
          notes: "Specialist referral partner - anxiety & PTSD",
          followUpFrequencyDays: 7,
        },
      }),
    ]);

    // Seed reminders
    const now = new Date();
    await Promise.all([
      prisma.reminder.create({
        data: {
          title: "Follow up with Sarah Chen",
          description: "Discuss Q2 partnership renewal",
          dueAt: new Date(now.getTime() + 2 * 24 * 3600000),
          status: "pending",
          contactId: contacts[0].id,
        },
      }),
      prisma.reminder.create({
        data: {
          title: "Submit Medicare claims",
          description: "Batch submit outstanding claims for March",
          dueAt: new Date(now.getTime() + 1 * 24 * 3600000),
          status: "pending",
          recurrenceRule: "monthly",
        },
      }),
      prisma.reminder.create({
        data: {
          title: "Review case notes - Wilson referrals",
          description: "3 new referrals need initial assessment notes",
          dueAt: new Date(now.getTime() - 1 * 3600000),
          status: "triggered",
          contactId: contacts[1].id,
        },
      }),
    ]);

    // Seed messages
    await Promise.all([
      prisma.message.create({
        data: {
          contactId: contacts[0].id,
          subject: "Q2 Partnership Review",
          body: "Hi Sarah,\n\nI wanted to touch base about our partnership for Q2. Would love to schedule a call this week to discuss the referral pipeline and any feedback from your team.\n\nBest regards",
          channel: "email",
          status: "draft",
        },
      }),
      prisma.message.create({
        data: {
          contactId: contacts[1].id,
          subject: "New client referral - appointment booked",
          body: "Hi James,\n\nThank you for referring Alex Thompson. I've booked their initial assessment for next Tuesday at 2pm. I'll send through my notes after the session.\n\nCheers",
          channel: "email",
          status: "sent",
        },
      }),
      prisma.message.create({
        data: {
          contactId: contacts[3].id,
          subject: "Case consultation request",
          body: "Hi Michael, wondering if you have availability for a case consultation this week? I have a complex presentation I'd value your input on.",
          channel: "email",
          status: "draft",
        },
      }),
    ]);

    // Seed notifications
    await Promise.all([
      prisma.notification.create({
        data: {
          title: "New referral received",
          body: "James Wilson sent a new client referral for Alex Thompson",
          notificationType: "referral",
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          title: "Appointment reminder",
          body: "Sarah Chen - Partnership review call tomorrow at 10am",
          notificationType: "appointment",
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          title: "Medicare claim processed",
          body: "Claim #MC-2026-0847 has been approved - $185.00",
          notificationType: "billing",
          isRead: true,
        },
      }),
    ]);

    console.log("Database seeded with sample data");
  } catch (e) {
    console.error("Seed error:", e);
  }
}
