# Untitled UI Redesign Sprint Plan

## Sprint Overview

**Duration**: 1 week (5 working days)
**Goal**: Replace the current blue-primary prototype styling with Untitled UI design foundations,
then re-skin all components to match Splose's production UI using Untitled UI as the base layer.

**Why Untitled UI**: Provides a comprehensive, well-structured design system with Figma-ready
components that map cleanly to the patterns we've observed in Splose (data tables, sidebars,
badges, forms, modals). Using it as a foundation gives P&E teams a professional starting point
they can extend.

---

## Pre-Sprint Checklist

- [ ] All 7 screenshot batches collected (35+ reference screenshots)
- [ ] Storybook running with extracted components
- [ ] Comparison pipeline working (capture + diff)
- [ ] Untitled UI assets downloaded / licensed

---

## Day 1: Foundation Setup

### Morning: Untitled UI Token Integration
1. **Install Untitled UI** (or manually extract tokens if using open-source subset)
2. **Create `styles/tokens.css`** mapping Untitled UI tokens to CSS variables:
   ```css
   :root {
     /* Untitled UI Gray scale */
     --gray-25: #FCFCFD;
     --gray-50: #F9FAFB;
     --gray-100: #F2F4F7;
     --gray-200: #EAECF0;
     --gray-300: #D0D5DD;
     --gray-500: #667085;
     --gray-700: #344054;
     --gray-900: #101828;

     /* Untitled UI Primary (remap to Splose purple) */
     --primary-25: #FCFAFF;
     --primary-50: #F4F3FF;
     --primary-100: #EBE9FE;
     --primary-500: #6366F1;  /* Splose purple */
     --primary-600: #5457E5;
     --primary-700: #4338CA;

     /* Untitled UI Success (for Final badges, confirmed dots) */
     --success-50: #ECFDF3;
     --success-500: #12B76A;
     --success-700: #027A48;

     /* Untitled UI Warning (for pending dots) */
     --warning-50: #FFFAEB;
     --warning-500: #F79009;
     --warning-700: #B54708;

     /* Untitled UI Error (for danger actions) */
     --error-50: #FEF3F2;
     --error-500: #F04438;
     --error-700: #B42318;
   }
   ```
3. **Update globals.css** to import and use the new token system
4. **Verify** existing components still render (visual regression check)

### Afternoon: Typography & Spacing
1. **Typography scale** from Untitled UI:
   - Display: 30px/38px semibold (page titles like "Appointments")
   - Text lg: 18px/28px (section headers)
   - Text sm: 14px/20px (table body, sidebar items)
   - Text xs: 12px/18px (badges, metadata)
2. **Spacing scale**: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
3. **Update all components** to use consistent spacing tokens

**Day 1 Deliverable**: Token system integrated, existing UI re-themed but structurally identical.

---

## Day 2: Core Component Rebuild

### Morning: Navigation Components
1. **TopNav** component matching Splose's production nav:
   - Logo (left), nav items (center), action icons (right)
   - Items: Dashboard, Calendar, Clients, Contacts, Waitlist, Invoices, Payments, Reports, Products
   - Active state: underline + bold
   - Height: 56px, white background, bottom border
2. **ClientSidebar** with Untitled UI styling:
   - Item list with counts (badges)
   - Purple left border on active item
   - Hover states

### Afternoon: Data Table
1. **DataTable** component with Untitled UI table patterns:
   - Header row: gray-50 background, 13px medium text
   - Sortable columns with chevron icons
   - Row hover state
   - Pagination bar: "1-10 of N items" + page buttons + page size dropdown
   - 3-dot action menu per row
2. **StatusDot** component: 10px colored circles
3. **Badge** component variants: Final (green), Draft (grey), Incomplete (outline)

**Day 2 Deliverable**: Navigation + table components in Storybook matching Splose screenshots.

---

## Day 3: Page Compositions

### Morning: Client Page Layout
1. **ClientLayout** - TopNav + ClientSidebar + content area
2. **AppointmentsPage** - Full table matching screenshot #06
3. **ProgressNotesPage** - Table matching screenshot #07

### Afternoon: More Pages
4. **CasesPage** - Table matching screenshot #08
5. **FormsPage** - Table matching screenshot #10
6. **Run screenshot comparison** against batches 01 + 02

**Day 3 Deliverable**: 4 page-level compositions rendering in Storybook and as routes.

---

## Day 4: Detail Views & Interactions

### Morning: Slide-Over Panel
1. **SlideOverPanel** - Right-side detail panel matching screenshot #09
   - Header with status dot + title + close button
   - Detail rows with icons (location, practitioner, time, client)
   - Linked items (forms, notes, invoices)
   - Action buttons (Book another, Edit, Reschedule, Archive)
2. Wire up panel to appointment row clicks

### Afternoon: Forms & Modals
3. **Login page** matching screenshot #01
4. **Edit Details form** matching screenshot #05
5. Polish all modal/sheet patterns to use Untitled UI

**Day 4 Deliverable**: Interactive detail views, forms, and modals.

---

## Day 5: Polish & Acceptance

### Morning: Visual QA
1. **Full screenshot comparison run** against all reference batches
2. **Fix any pixel_diff > 10%** areas
3. **Cross-check all key_elements** from manifests
4. **Dark mode pass** (if applicable)
5. **Mobile responsive check** at 390px viewport

### Afternoon: Documentation & Handover
6. **Update CLAUDE.md** with any new patterns or conventions
7. **Update HANDOVER.md** with sprint outcomes
8. **Deploy Storybook** to a shareable URL (Chromatic or Vercel)
9. **Create PR** summarizing the sprint changes
10. **Final comparison report** committed to repo

**Day 5 Deliverable**: Polished prototype, deployed Storybook, comprehensive comparison report.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pixel diff vs reference (avg) | < 10% |
| Components in Storybook | 15+ |
| Pages matching reference | 8+ |
| Storybook deployed | Yes |
| P&E team can run `npm run storybook` | Yes |
| P&E team can describe a change and Claude implements it | Yes |

---

## Component Inventory (Sprint Target)

| Component | Untitled UI Base | Splose Customization |
|-----------|-----------------|---------------------|
| TopNav | Navigation header | Logo + specific nav items |
| ClientSidebar | Sidebar navigation | Counts + purple active border |
| DataTable | Table | Sortable + status dots + action menus |
| Badge | Badge | Final/Draft/Incomplete variants |
| StatusDot | (custom) | Green/yellow/orange 10px circles |
| Pagination | Pagination | "1-10 of N" + page buttons + size dropdown |
| ActionMenu | Dropdown menu | 3-dot trigger |
| SlideOverPanel | (custom) | Right-side detail view |
| SearchBar | Input | With "Search" button |
| Button | Button | Primary/secondary/danger variants |
| Form inputs | Input/Select/Textarea | Splose styling |
| Modal/Sheet | Modal | Bottom sheet on mobile |
| TabBar | Tabs | Horizontal filter tabs |
| EmptyState | (custom) | Centered message |

---

## Risk Mitigation

1. **Untitled UI licensing**: Verify license allows derivative work. Fallback: extract
   design tokens manually from public documentation.
2. **React 19 compatibility**: Test all Untitled UI React components with React 19.
   Fallback: use only CSS/token layer, build custom React components.
3. **Screenshot volume**: If we can't collect all 35 screenshots before sprint start,
   prioritize the 10 we have (batches 01-02) and add more during the sprint.
4. **Storybook + Next.js 15**: Storybook 8.4+ required. If build issues arise,
   use standalone HTML stories as fallback.
