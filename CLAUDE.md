# Productivity Assistant — Project Guide

## What is this?

A mobile-first personal productivity assistant built with Next.js 15 (App Router). It manages reminders, contacts, messages, and conversations with an AI chat interface powered by Claude. The UI is designed for phone-sized screens with a native-app feel.

## Tech Stack

- **Framework**: Next.js 15.1 with App Router, React 19, TypeScript
- **Database**: SQLite via Prisma ORM (graceful fallback for serverless)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) with keyword-based fallback
- **Styling**: Vanilla CSS with CSS custom properties (no component library)
- **Screenshots**: Playwright for automated visual regression
- **Deployment**: Vercel-ready (see `next.config.ts`)

## Project Structure

```
app/
  page.tsx              # Main UI — single-file component with all pages
  globals.css           # All styles (variables, components, animations)
  layout.tsx            # Root layout with PWA meta
  api/
    chat/               # POST /send, GET /conversations, GET|PUT /conversations/[id]
    contacts/           # CRUD + /[id]/mark-contacted
    reminders/          # CRUD + /[id]/snooze, /[id]/dismiss
    messages/           # CRUD + /[id]/mark-sent, /draft-assist
    notifications/      # GET list, /unread-count, /read-all, /[id]/read
    suggestions/        # GET — contextual AI suggestion chips
lib/
  chat.ts               # Claude API integration + fallback response logic
  prisma.ts             # Prisma client singleton
  api-helpers.ts        # withDb() wrapper for graceful DB error handling
prisma/
  schema.prisma         # 6 models: Contact, Reminder, Message, Conversation, ConversationTurn, Notification
types/
  speech.d.ts           # Web Speech API type declarations
screenshot-loop.js      # Multi-page, multi-theme visual regression tool
```

## Architecture Decisions

**Single-file UI**: The entire frontend lives in `app/page.tsx`. This is intentional — the app is small enough that component extraction adds indirection without benefit. If it grows past ~800 lines, consider splitting into components.

**Tab-based SPA**: Navigation uses React state (`page` variable), not Next.js routing. All pages render in the same route (`/`). This keeps the mobile-app feel with instant tab switches.

**Serverless-safe**: The chat system uses DB-first with in-memory fallback (`memoryConvs` map in `lib/chat.ts`). Prisma calls are wrapped in try/catch everywhere. API routes use `withDb()` from `api-helpers.ts` for consistent error handling.

**No component library**: All styling is hand-written CSS. The design system uses CSS custom properties in `:root` / `[data-theme="dark"]`. Adding Tailwind or a UI library is unnecessary for this scope.

## Key Features

### QuickChat FAB + Bottom Sheet
- Floating action button appears on all pages except the Chat tab
- Opens a bottom sheet with its own chat session
- Swipe-up on FAB to open, swipe-down on sheet handle to dismiss
- Chat history persisted in `sessionStorage` across open/close

### AI Suggestion Bar
- `GET /api/suggestions` returns contextual chips based on real data:
  - Overdue reminders, contacts needing follow-up, pending drafts, unread notifications
- Displayed as horizontally scrollable chips below the header
- Refreshes every 60s and after CRUD operations

### Quick Actions from Chat
- Assistant responses are parsed for actionable keywords
- Inline buttons (Create Reminder, Draft Message, View Contacts) appear below relevant messages
- Actions close the sheet and navigate/open modals

### Voice Input
- Mic button on both main chat and QuickChat using Web Speech API
- Red pulse animation when listening; transcript fills the input

## Development

```bash
# Install dependencies
npm install

# Set up the database
cp .env.example .env   # or create .env with DATABASE_URL="file:./dev.db"
npx prisma db push

# Run dev server
npm run dev             # http://localhost:3000

# Build for production
npm run build
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:./dev.db` |
| `ANTHROPIC_API_KEY` | No | Enables Claude API; falls back to keyword matching without it |

### Screenshot Comparison

```bash
# Start the dev server first, then in another terminal:
node screenshot-loop.js
```

Captures all pages in both light/dark themes at iPhone 14 resolution (390x844 @2x). When changes are detected, previous screenshots are saved as `*_prev.png` for visual comparison. Screenshots go to `./screenshots/`.

Pages captured: chat, contacts, reminders, messages, notifications, quickchat-fab, quickchat-sheet, suggestion-bar.

## API Patterns

All API routes follow the same pattern:
- JSON request/response with `Content-Type: application/json`
- 204 for successful deletes
- Error responses: `{ "detail": "..." }` or `{ "error": "..." }`
- DB errors return 503 with a helpful message, or gracefully fall back

The client-side `api<T>()` helper in `page.tsx` handles this uniformly.

## Styling Conventions

- CSS custom properties for all colors, spacing, and shadows
- Dark mode via `[data-theme="dark"]` attribute on `<html>`
- Spring curves: `cubic-bezier(0.34, 1.56, 0.64, 1)` for interactive elements
- Mobile-first: only one `@media (min-width: 640px)` breakpoint for desktop
- Safe area insets (`env(safe-area-inset-bottom)`) for notch support
- `:active` with `transform: scale()` for tap feedback on all interactive elements

## Common Tasks

**Add a new page/tab**: Add to the `pages` array in the bottom nav JSX, add a `page === "name"` block in the container, add data loading in `showPage()`.

**Add a new API route**: Create `app/api/<name>/route.ts`, use `withDb()` from `api-helpers.ts`, follow existing patterns.

**Add a new Prisma model**: Update `prisma/schema.prisma`, run `npx prisma db push`, add API routes, add UI.

**Modify suggestion logic**: Edit `app/api/suggestions/route.ts`. Each suggestion needs `id`, `text`, `action` (chat/navigate/create), `icon`, and `priority`.

**Test on mobile**: Use the screenshot loop or Chrome DevTools device toolbar at 390x844.
