# Splose UI Prototype - Claude Agent Guide

## Project Overview

This is a **high-fidelity Splose UI prototype** built in Next.js 15 + React 19. The goal is to
create a pixel-accurate reproduction of the Splose practice management SaaS that Product & Engineering
teams can use as a starting point for prototyping changes with AI agents.

**Production Splose URL**: `acme.splose.com`
**Prototype Stack**: Next.js 15, React 19, TypeScript, Prisma (SQLite), Playwright

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Set up database
cp .env.example .env
npx prisma db push

# 3. Run dev server
npm run dev

# 4. Run Storybook (component library)
npm run storybook

# 5. Capture prototype screenshots
node scripts/capture-prototype.js

# 6. Compare against reference screenshots
node scripts/compare-screenshots.js
```

## Architecture

```
app/
  page.tsx          # Main app (currently monolithic - being decomposed)
  globals.css       # Design tokens + all styles
  layout.tsx        # Root layout with PWA config
  api/              # REST API routes (Prisma-backed)
    chat/           # AI chat (Anthropic SDK)
    contacts/       # CRUD + mark-contacted
    messages/       # CRUD + draft-assist + mark-sent
    reminders/      # CRUD + snooze + dismiss
    notifications/  # CRUD + unread-count + read-all
components/         # Extracted reusable components (Storybook-ready)
  DataTable/        # Sortable table with pagination
  Sidebar/          # Client sidebar navigation
  Badge/            # Status badges (Final, Draft, Incomplete)
lib/
  prisma.ts         # Prisma client singleton
  api-helpers.ts    # withDb() error wrapper
  chat.ts           # Anthropic chat integration
references/
  screenshots/
    batch-01/       # Login, Client Details/Edit (manifest.json)
    batch-02/       # Appointments, Notes, Cases, Forms, Detail Panel
    batch-NN/       # Future batches
    generated/      # Auto-captured prototype screenshots
    diffs/          # Visual diff output
scripts/
  compare-screenshots.js  # Pixelmatch-based visual diff
  capture-prototype.js    # Playwright screenshot capture
.storybook/         # Storybook 8 config
```

## Key Workflows

### 1. Screenshot Comparison Loop
```
Reference (Splose prod) --> Compare --> Diff Report --> Fix Code --> Re-capture --> Compare again
```
- References live in `references/screenshots/batch-NN/manifest.json`
- Each manifest describes key UI elements to match
- `node scripts/compare-screenshots.js` produces diff images + JSON report
- Target: < 10% pixel diff per screenshot

### 2. Component Extraction
The monolithic `app/page.tsx` (500 lines) is being decomposed into Storybook components:
- Extract component → Create stories → Match against reference screenshot → Iterate

### 3. Adding New Reference Screenshots
- Create `references/screenshots/batch-NN/` directory
- Add `manifest.json` following the schema of existing batches
- Include filename, page, url, description, key_elements array
- Commit in batches of 5 (chat image limit)

## Splose Design System (Extracted from Screenshots)

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Purple (active) | `#6366f1` | Nav active state, links, sidebar highlight border |
| Green (confirmed) | `#22c55e` | Final badge, confirmed status dot |
| Yellow (pending) | `#eab308` | Pending/upcoming status dot |
| Orange (overdue) | `#f97316` | Overdue/warning status dot |
| Red (danger) | `#ef4444` | Archive button, danger actions |
| Grey (draft) | `#4b5563` | Draft badge background |
| Background | `#ffffff` | Page background |
| Sidebar BG | `#fafafa` | Left sidebar |
| Table header | `#f9fafb` | Table header row background |
| Border | `#e5e7eb` | Table/card borders |

### Typography
- Font: Inter / system-ui
- Page heading: 24px semibold
- Table header: 13px medium, uppercase-ish
- Table body: 14px regular
- Sidebar items: 14px with counts in grey
- Badge text: 12px semibold

### Layout Patterns
- **Top nav**: Full-width, logo left, nav items center, actions right (56px height)
- **Client sidebar**: 180px width, items with counts, purple left border on active
- **Data tables**: Sortable column headers, 10/page pagination, 3-dot action menus
- **Slide-over panels**: Right-side detail panels (appointment details)
- **Status dots**: 10px colored circles (green/yellow/orange)
- **Badges**: Pill-shaped, colored background (Final=green, Draft=grey, Incomplete=outline)

## Coding Conventions

- **TypeScript** with strict mode
- **CSS variables** for all design tokens (see `globals.css :root`)
- **CSS modules** for new components
- **Server Components** by default; `"use client"` only when needed
- **Prisma** for all database access via `lib/prisma.ts`
- **API routes** return JSON, use `withDb()` wrapper for error handling
- Prefer editing existing files over creating new ones
- Keep components small and focused

## What's Been Done (as of session_01PRQNwnqnVAZdyv8DUoavpN)

1. Full Next.js app with working API backend (contacts, reminders, messages, chat, notifications)
2. Monolithic but functional UI with mobile-first layout
3. 10 Splose reference screenshots catalogued in 2 batches with detailed manifests
4. Screenshot comparison plan documented
5. Storybook setup with initial component extraction
6. Comparison scripts (pixelmatch-based diffing + Playwright capture)

## What Needs To Be Done

### Immediate (This Sprint)
1. **Continue screenshot collection** - Batches 3-7 covering remaining Splose pages
2. **Component extraction** - Decompose page.tsx into reusable Storybook components
3. **Build Splose layout** - Top nav, client sidebar, page chrome matching production
4. **Data table component** - The core reusable element across all Splose pages

### Untitled UI Redesign Sprint (1 Week)
See `REDESIGN_SPRINT.md` for the full plan. Key milestones:
- Day 1-2: Untitled UI design token integration + base components
- Day 3-4: Page-level compositions matching Splose structure
- Day 5: Polish, screenshot comparison, acceptance testing

### Ongoing
- Keep Storybook up to date as components are extracted
- Run screenshot comparison after each significant UI change
- Collect more reference screenshots as new Splose pages are identified

## For P&E Teams

### Using the Prototype
```bash
npm run storybook  # Browse component library at localhost:6006
npm run dev        # Run full prototype at localhost:3000
```

### Prototyping Changes with Claude
1. Describe the change you want (e.g., "Add a new column to the appointments table")
2. Claude will modify the component, update Storybook stories, and capture screenshots
3. Compare against reference to ensure consistency

### Adding Reference Screenshots
1. Take screenshot of Splose production page
2. Share with Claude (5 at a time)
3. Claude catalogs them in a new batch manifest
4. These become the ground truth for comparison
