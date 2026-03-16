# Session Handover Document

## For: Next Claude Session Continuing Splose UI Prototype Development

**Previous Session**: `session_01PRQNwnqnVAZdyv8DUoavpN`
**Branch**: `claude/resume-splose-prototype-liOUq`
**Date**: 2026-03-16

---

## TL;DR

We're building a high-fidelity Splose UI prototype in Next.js that P&E teams will use to prototype
changes with AI agents. We've catalogued 10 reference screenshots from production Splose, set up a
screenshot comparison pipeline, started decomposing the monolithic UI into Storybook components, and
planned a 1-week redesign sprint using Untitled UI. Read CLAUDE.md for the full agent guide.

---

## What Exists Right Now

### Working Application
- **Next.js 15 app** at `app/page.tsx` - monolithic but functional
- **5 views**: Chat, Contacts, Reminders, Messages, Notifications
- **3 modals**: Add Contact, Add Reminder, Draft Message
- **REST API**: 18 route handlers under `app/api/`
- **Database**: Prisma + SQLite with 6 models (Contact, Reminder, Message, Conversation, ConversationTurn, Notification)
- **AI Chat**: Anthropic SDK integration for conversational assistant

### Reference Screenshot Library
Two batches catalogued with detailed manifests:

**Batch 01** (`references/screenshots/batch-01/manifest.json`):
| # | Page | Key Observation |
|---|------|----------------|
| 01 | Login | Purple gradient header, Splose hand-wave illustration |
| 02 | Client > Cases | Data table, sidebar nav, pagination |
| 03 | Client > Progress Notes | Search, Final/Draft badges, sortable columns |
| 04 | Client > Appointments | Color-coded status dots, Draft invoice badges |
| 05 | Client > Edit Details | Multi-section form, photo upload, dropdowns |

**Batch 02** (`references/screenshots/batch-02/manifest.json`):
| # | Page | Key Observation |
|---|------|----------------|
| 06 | Client > Appointments (full) | 14 items, green/yellow/orange dots, 3-dot menus |
| 07 | Client > Progress Notes (full) | 28 items, Final/Draft badges, linked service dates |
| 08 | Client > Cases (full) | Budget/Hours/Appointments types, allocated vs invoiced |
| 09 | Appointment Detail Panel | Right slide-over, rich detail view, action buttons |
| 10 | Client > Forms | Incomplete badges, related appointment links |

### Infrastructure
- **Screenshot comparison plan**: `SCREENSHOT_COMPARISON_PLAN.md`
- **Comparison script**: `scripts/compare-screenshots.js` (pixelmatch-based)
- **Capture script**: `scripts/capture-prototype.js` (Playwright)
- **Storybook**: `.storybook/` config + initial components in `components/`
- **Session hook**: `.claude/hooks/session-start.sh` for auto-onboarding

---

## Architecture Decisions Made

1. **Monolith-first, then extract**: The working prototype was built fast in a single page.tsx.
   Components are being extracted into `components/` with Storybook stories as we go.

2. **CSS Variables over CSS-in-JS**: Using globals.css with CSS custom properties for theming.
   New components use CSS modules that reference these variables.

3. **Manifest-driven screenshots**: Each batch has a `manifest.json` that describes every screenshot
   with key_elements arrays. This drives the comparison pipeline and tells future sessions exactly
   what UI patterns to match.

4. **Pixelmatch for diffing**: Lightweight, no heavy dependencies. Produces visual diff PNGs and
   a JSON report with pixel_diff_percent per screenshot.

5. **Untitled UI for redesign**: The week sprint will introduce Untitled UI design tokens and
   components as the foundation layer beneath Splose-specific styling.

---

## Current State of Each Concern

### UI Components (Extraction Progress)
| Component | Status | Location |
|-----------|--------|----------|
| DataTable | Created | `components/DataTable/` |
| ClientSidebar | Created | `components/Sidebar/` |
| Badge | Created | `components/Badge/` |
| TopNav | Not started | Needed for Splose chrome |
| SlideOverPanel | Not started | For appointment details |
| StatusDot | Not started | Green/yellow/orange indicators |
| Pagination | Not started | 10/page with page selector |
| SearchBar | Not started | Used in Notes, Forms |
| ActionMenu | Not started | 3-dot dropdown menus |
| Modal (bottom sheet) | Exists in page.tsx | Needs extraction |

### Design Tokens
| Token Set | Status | Notes |
|-----------|--------|-------|
| Current (blue primary) | In globals.css | Working but doesn't match Splose |
| Splose tokens | Documented in CLAUDE.md | Purple primary, extracted from screenshots |
| Untitled UI tokens | Not started | Sprint week deliverable |

### Pages to Build
| Page | Priority | Reference Batch | Status |
|------|----------|----------------|--------|
| Client Sidebar + Chrome | P0 | Batch 01-02 | Not started |
| Top Navigation | P0 | Batch 01-02 | Not started |
| Appointments Table | P1 | Batch 02 (#06) | Not started |
| Progress Notes Table | P1 | Batch 02 (#07) | Not started |
| Cases Table | P1 | Batch 02 (#08) | Not started |
| Appointment Detail Panel | P1 | Batch 02 (#09) | Not started |
| Forms Table | P2 | Batch 02 (#10) | Not started |
| Login Page | P2 | Batch 01 (#01) | Not started |
| Edit Details Form | P2 | Batch 01 (#05) | Not started |
| Dashboard | P3 | Not captured | Needs screenshot |
| Calendar | P3 | Not captured | Needs screenshot |

---

## How to Continue

### Option A: Continue Screenshot Collection
Ask the user to share 5 more Splose screenshots. Create `batch-03/manifest.json` following
the same schema. Suggested next captures:
- Communications tab
- Files tab
- Invoices tab
- Payments tab
- Dashboard or Calendar

### Option B: Start Component Building
1. Read the manifests in `references/screenshots/batch-01/` and `batch-02/`
2. Start with the **Splose top navigation** and **client sidebar** (shared chrome)
3. Build the **DataTable** component to match Splose's table pattern
4. Create Storybook stories for each
5. Capture screenshots and run comparison

### Option C: Untitled UI Sprint
See `REDESIGN_SPRINT.md` for the full plan. This is a week-long focused effort.

### Option D: Storybook Polish for P&E
1. Run `npm run storybook`
2. Ensure all extracted components have complete stories
3. Add interaction tests
4. Deploy Storybook (Chromatic or Vercel)

---

## Files to Read First

In priority order for a new session:

1. **This file** (`HANDOVER.md`) - You're reading it
2. **`CLAUDE.md`** - Agent instructions, design system, workflows
3. **`SCREENSHOT_COMPARISON_PLAN.md`** - Detailed comparison methodology
4. **`REDESIGN_SPRINT.md`** - Untitled UI sprint plan
5. **`references/screenshots/batch-01/manifest.json`** - First 5 screenshots
6. **`references/screenshots/batch-02/manifest.json`** - Next 5 screenshots
7. **`app/page.tsx`** - Current monolithic UI (500 lines)
8. **`app/globals.css`** - All current design tokens and styles
9. **`prisma/schema.prisma`** - Data model

---

## Known Issues & Gotchas

1. **No .env file committed** - Each session needs to create one (just `DATABASE_URL="file:./dev.db"`)
2. **Screenshots dir is gitignored** - Only `references/screenshots/` is tracked (via `!references/screenshots/` override)
3. **Playwright path hardcoded** - `screenshot-loop.js` has a hardcoded Chrome path that may differ per environment
4. **Monolithic page.tsx** - Component extraction is in progress; don't add new features to page.tsx, extract first
5. **No tests yet** - Add component tests alongside Storybook stories
6. **SQLite only** - Works for prototyping but won't scale; fine for this use case

---

## Git Conventions

- Branch: `claude/resume-splose-prototype-liOUq`
- Commit style: Descriptive messages with context (see git log)
- Push after each meaningful batch of changes
- Include session URL in commit messages

---

## Contact & Context

- **Repository**: jimyencken/refactored-octo-dollop
- **Owner**: Jim Yencken
- **Purpose**: Splose UI prototype for P&E team prototyping with AI agents
- **Target Users**: Product managers and engineers who will use Claude + this prototype to explore UI changes
