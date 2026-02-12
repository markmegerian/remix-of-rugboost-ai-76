

# Mobile-First Dashboard Redesign

## The Problem

The Dashboard jobs list uses a 7-column HTML table (Date, Job #, Client, Rugs, Status, Payment, Actions) that requires horizontal scrolling on mobile. This is the primary usability blocker -- users on phones (the majority of your user base) have to swipe left/right just to see basic job info.

## The Solution: Card Layout on Mobile, Table on Desktop

Replace the table with a **responsive card list** that shows on small screens, while keeping the table for tablets and desktops. Each job becomes a tappable card that shows all critical info at a glance, no scrolling required.

### What a mobile job card looks like:

```text
+------------------------------------------+
| John Smith                    In Progress |
| Job #2024-001          Dec 15, 2024       |
| 3 rugs                 $450 - Pending     |
+------------------------------------------+
```

- Client name (bold, prominent) + status badge on the right
- Job number + date on the second line
- Rug count + payment info on the third line
- The entire card is tappable (navigates to job detail)
- No "View" button needed -- the card itself is the tap target

### Breakpoint strategy

- **Mobile (below `md`):** Stacked card list
- **Tablet/Desktop (`md` and up):** Current table layout (unchanged)

## Technical Changes

### 1. Create `src/components/JobCard.tsx` (new file)

A compact card component for a single job, designed for touch targets (minimum 48px height). Displays:
- Row 1: Client name (left) + status badge (right)
- Row 2: Job number in mono font (left) + formatted date (right)  
- Row 3: Rug count badge (left) + payment amount and status (right)
- Full-card `onClick` navigates to `/jobs/{id}`
- Uses existing `getStatusBadge` and `getPaymentBadge` helpers (extracted from Dashboard)

### 2. Modify `src/pages/Dashboard.tsx`

- Extract `getStatusBadge` and `getPaymentBadge` into a shared location (or pass as props) so both the table and card can use them
- In the Jobs section (lines 256-313), wrap the existing table in a `hidden md:block` container
- Add a `md:hidden` container that renders `JobCard` components in a vertical stack
- The stats grid already uses `grid-cols-2 md:grid-cols-4` which works well on mobile -- no changes needed there

### 3. Minor filter improvements for mobile

The `JobsFilter` component already uses `grid-cols-2 sm:grid-cols-4` which is reasonable, but the filter selects can feel cramped. Minor tweaks:
- Ensure select trigger text truncates cleanly on small screens
- Keep filter badges wrapping as they already do

### 4. No changes to other pages

- **JobDetail** already has `MobileJobActionBar` and mobile-first stacking -- it's in good shape
- **NewJob** is already a single-column centered form -- works fine on mobile
- **Settings** cards already stack vertically

## What stays the same

- All data fetching, filtering, and routing logic
- The desktop table view (tablet and up)
- Stats cards (already responsive)
- Filter bar (already responsive)
- Mobile navigation sheet
- All other pages

## Technical Details

The implementation uses Tailwind responsive utility classes (`md:hidden` / `hidden md:block`) to swap between card and table layouts with zero JavaScript overhead. The card component reuses existing badge and formatting utilities. The `useIsMobile` hook is NOT needed here since CSS handles the breakpoint switching.

