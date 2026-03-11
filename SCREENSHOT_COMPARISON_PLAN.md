# Screenshot Comparison & Refinement Flow

## Overview

A systematic workflow for comparing Splose production screenshots against our prototype, identifying visual gaps, and iteratively refining the prototype until it matches the reference UI.

## Directory Structure

```
references/
  screenshots/
    batch-01/          # Login, Client Details/Edit
    batch-02/          # Appointments, Notes, Cases, Forms, Detail Panel
    batch-03/          # (next: Communications, Files, Invoices, Payments, etc.)
    batch-NN/
    generated/         # Prototype screenshots (auto-captured)
    diffs/             # Visual diff output
```

## Phase 1: Screenshot Collection (batches of 5)

### Completed
| Batch | Screenshots | Pages Covered |
|-------|------------|---------------|
| 01 | 01-05 | Login, Client Cases, Progress Notes, Appointments, Edit Details |
| 02 | 06-10 | Appointments (full), Progress Notes (full), Cases (full), Appointment Detail Panel, Forms |

### Remaining (suggested batches)
| Batch | Screenshots | Pages to Capture |
|-------|------------|------------------|
| 03 | 11-15 | Communications, Files, Invoices, Payments, Statements |
| 04 | 16-20 | Dashboard, Calendar (month view), Calendar (week view), Waitlist, Contacts list |
| 05 | 21-25 | New Appointment modal, New Invoice modal, New Contact modal, Reports, Products |
| 06 | 26-30 | Settings, User profile, Notifications panel, Search, Letters |
| 07 | 31-35 | Mobile responsive views (5 key pages at 390px width) |

## Phase 2: Prototype Page Build

For each reference screenshot, build the corresponding page/component:

1. **Parse the manifest** - Read `manifest.json` for the batch
2. **Identify key elements** - Extract layout structure, components, colors, typography
3. **Build the page** - Create Next.js page/component matching the reference
4. **Capture prototype screenshot** - Use Playwright to screenshot the built page
5. **Store in `generated/`** - Named to match reference (e.g., `06-client-appointments-full.png`)

### Page Priority Order
1. Client sidebar navigation (shared across all client pages)
2. Top navigation bar (shared across all pages)
3. Data table component (reusable across Cases, Appointments, Notes, Forms)
4. Appointments table + detail panel
5. Progress notes table
6. Cases table
7. Forms table
8. Login page

## Phase 3: Visual Comparison

### Automated Comparison Script

```
scripts/compare-screenshots.js
```

**Approach:** Use `pixelmatch` (lightweight, no heavy deps) to diff reference vs generated screenshots.

#### Comparison Metrics
- **Pixel diff %** - Raw pixel-level difference
- **Structural similarity** - Layout match (columns, rows, spacing)
- **Color accuracy** - Palette match against Splose brand colors
- **Component coverage** - Which key_elements from manifest are present

#### Output
For each screenshot pair:
```
diffs/
  06-client-appointments-full-diff.png    # Visual overlay (red = difference)
  comparison-report.json                  # Structured results
```

### comparison-report.json Format
```json
{
  "generated_at": "2026-03-11T12:00:00Z",
  "results": [
    {
      "reference": "batch-02/06-client-appointments-full.png",
      "generated": "generated/06-client-appointments-full.png",
      "pixel_diff_percent": 12.4,
      "missing_elements": ["3-dot action menus", "pagination"],
      "status": "needs_refinement",
      "priority": "high"
    }
  ]
}
```

## Phase 4: Refinement Loop

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Reference │───>│ Compare  │───>│  Report  │  │
│  │ Screenshot│    │  Script  │    │  (JSON)  │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│       ▲               │               │         │
│       │               │               ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Re-capture│<───│  Refine  │<───│ Identify │  │
│  │ Screenshot│    │   Code   │    │   Gaps   │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Refinement Steps (per page)

1. **Run comparison** → `node scripts/compare-screenshots.js`
2. **Review diff image** → Red pixels show areas that don't match
3. **Check missing elements** → Cross-reference manifest key_elements
4. **Fix CSS/layout/components** → Adjust prototype code
5. **Re-capture** → Run Playwright screenshot
6. **Re-compare** → Loop until pixel_diff < 5% threshold
7. **Commit** → Save progress after each improvement round

### Acceptance Criteria
- **Layout match**: Column widths, spacing, and alignment within 5px
- **Color match**: Brand colors (Splose purple #6366f1, status green/yellow/orange/red) within delta-E < 3
- **Component parity**: All key_elements from manifest are rendered
- **Responsive**: Mobile screenshots (batch-07) match at 390px viewport
- **Pixel diff**: < 10% overall (accounting for dynamic data differences)

## Phase 5: CI Integration (Future)

Once the refinement loop is stable:

1. **GitHub Action** on PR:
   - Build prototype → capture screenshots → compare against references
   - Post comparison report as PR comment
   - Fail if pixel_diff > threshold

2. **Reference update workflow**:
   - When Splose UI changes, capture new reference screenshots
   - Create new batch, run comparison, identify regressions

## Design System Extraction

As we refine, extract reusable design tokens from the references:

### Observed Splose Design Tokens
```css
/* Colors */
--splose-purple: #6366f1;        /* Nav active, links, sidebar highlight */
--splose-green-badge: #22c55e;   /* Final badge, confirmed status dot */
--splose-yellow-dot: #eab308;    /* Pending status */
--splose-orange-dot: #f97316;    /* Overdue/warning status */
--splose-red: #ef4444;           /* Archive button, danger actions */
--splose-grey-badge: #4b5563;    /* Draft badge */
--splose-bg: #ffffff;            /* Page background */
--splose-sidebar-bg: #fafafa;    /* Left sidebar */
--splose-table-header: #f9fafb;  /* Table header row */
--splose-border: #e5e7eb;        /* Table/card borders */

/* Typography */
--font-family: Inter, system-ui, sans-serif;
--heading-size: 24px;
--table-header-size: 13px;
--table-body-size: 14px;
--sidebar-size: 14px;
--badge-size: 12px;

/* Spacing */
--sidebar-width: 180px;
--top-nav-height: 56px;
--page-padding: 24px;
--table-cell-padding: 12px 16px;
--card-border-radius: 8px;
--badge-border-radius: 12px;

/* Components */
--status-dot-size: 10px;
--action-menu-icon: 24px (3-dot vertical);
--pagination-height: 48px;
```

## Quick Start

```bash
# 1. Start the prototype
npm run dev

# 2. Capture prototype screenshots
node screenshot-loop.js

# 3. Run comparison (once script is built)
node scripts/compare-screenshots.js

# 4. View results
open references/screenshots/diffs/comparison-report.json
```

## Next Steps

1. Send batches 3-7 of reference screenshots (5 per batch)
2. Build the reusable data table component matching Splose's table pattern
3. Build client sidebar navigation component
4. Build top navigation bar
5. Create `scripts/compare-screenshots.js` using pixelmatch
6. Start refinement loop on batch-01 pages
