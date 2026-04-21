# Design Document

## BookMyShow Mobile UI Redesign

---

## Overview

This design covers a targeted UI/CSS redesign of the customer-facing dashboard to deliver a BookMyShow-style mobile experience. The current implementation has several concrete problems: the sidebar and bottom nav render simultaneously on mobile, buttons overflow or get clipped inside event cards, typography is inconsistent across components, and there is no unified spacing or box-sizing system.

The redesign is **additive and non-breaking** — it does not change data models, API contracts, or routing. It modifies five existing components (`DashboardLayout`, `AppSidebar`, `BottomNavBar`, `EventCard`, `CustomerDashboard`) and adds CSS custom property tokens to `index.css`.

**Tech stack:** React 18, TypeScript, Tailwind CSS v3, shadcn/ui, Vite. Testing: Vitest + Testing Library + fast-check (already installed).

---

## Architecture

The redesign operates entirely within the frontend presentation layer. No backend changes are required.

```
index.css
  └── CSS custom properties: spacing tokens, typography tokens, box-sizing reset

DashboardLayout.tsx
  ├── Reads viewport via useIsMobile() hook (< 768px threshold)
  ├── Renders AppSidebar only on desktop (hidden on mobile)
  └── Renders BottomNavBar only on mobile (hidden on desktop)

AppSidebar.tsx
  └── No structural changes; visibility controlled by DashboardLayout

BottomNavBar.tsx
  ├── Height: 60px (updated from 70px)
  ├── 5 items: Home, Events, Bookings, Billings, Profile
  └── safe-area-inset-bottom padding

EventCard.tsx
  ├── border-radius: 12px (rounded-xl)
  ├── box-shadow tokens (default + hover)
  ├── CardContent padding: 12px (p-3)
  └── Full-width action buttons

CustomerDashboard.tsx
  ├── Section order: Search → Banner → Categories → Events
  ├── Responsive grid: 1 col (<480px) / 2 col (480–768px) / 2+ col (>768px)
  ├── Spacing tokens applied to section gaps and card padding
  └── Skeleton loading state for event cards
```

### Breakpoint Strategy

| Breakpoint | Width | Navigation | Event Grid |
|---|---|---|---|
| Mobile | < 480px | Bottom Nav only | 1 column |
| Tablet | 480px – 767px | Bottom Nav only | 2 columns |
| Desktop | ≥ 768px | Sidebar only | 2+ columns |

The `useIsMobile()` hook (already in the codebase at `frontend/src/hooks/use-mobile.ts`) returns `true` for widths < 768px and is used to gate navigation rendering.

---

## Components and Interfaces

### 1. `index.css` — CSS Token Additions

New CSS custom properties added to the `:root` block:

```css
/* Spacing tokens */
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;

/* Typography tokens */
--font-size-h1: 18px;
--font-weight-h1: 600;
--font-size-h2: 16px;
--font-weight-h2: 600;
--font-size-body: 14px;
--font-weight-body: 400;
--font-size-small: 12px;
--font-weight-small: 400;

/* Box-sizing reset */
*, *::before, *::after {
  box-sizing: border-box;
}
```

> **Note on naming:** The requirements use `--font-h1` as a shorthand name. Since CSS custom properties cannot encode two values (font-size + font-weight) in a single property, the implementation uses paired properties `--font-size-h1` / `--font-weight-h1`. Tailwind utility classes (`text-lg font-semibold`, `text-sm font-normal`, etc.) are used in components to apply these values consistently, with the CSS variables available for any non-Tailwind usage.

### 2. `DashboardLayout.tsx` — Navigation Gating

**Current problem:** The sidebar is hidden via `hidden sm:flex` (640px breakpoint) but the BottomNavBar uses its own `block md:hidden` (768px breakpoint), creating a gap where both can appear between 640–768px.

**Fix:** Unify the breakpoint. The sidebar wrapper changes from `hidden sm:flex` to `hidden md:flex` (768px). The BottomNavBar already uses `md:hidden`. This ensures mutual exclusivity at the 768px boundary.

```tsx
// Before
<div className="hidden sm:flex">
  <AppSidebar />
</div>

// After
<div className="hidden md:flex">
  <AppSidebar />
</div>
```

The main content area padding-bottom is updated to use the spacing token:

```tsx
<main
  style={{
    flex: 1,
    overflowY: "auto",
    padding: "var(--space-md)",          // 12px all sides
    paddingBottom: isMainPage ? "80px" : "var(--space-lg)",
  }}
>
```

### 3. `BottomNavBar.tsx` — Height and Safe Area

**Changes:**
- Height updated from `70px` to `60px` (per requirement 1.3)
- The `navItems` array already has the correct 5 items (Home, Events, Bookings, Billings, Settings→Profile). The "Settings" label is renamed to "Profile" to match the requirement.
- `paddingBottom: "env(safe-area-inset-bottom)"` is already present and must be preserved.

```tsx
// Height change
height: "60px",  // was 70px

// Label change
{ label: "Profile", icon: Settings, to: "/dashboard/profile-settings" },
```

### 4. `EventCard.tsx` — Card Design

**Changes to the outermost `<Card>` element:**

```tsx
// Before
<Card className="group overflow-hidden rounded-xl border-0 bg-card/50 backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:shadow-xl ...">

// After
<Card className="group overflow-hidden rounded-xl border-0 bg-card/50 backdrop-blur-sm
  shadow-[0_2px_8px_rgba(0,0,0,0.08)]
  hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)]
  transition-shadow duration-300">
```

**Changes to `<CardContent>`:**

```tsx
// Before
<CardContent className="p-3">

// After — p-3 is already 12px in Tailwind, no change needed
<CardContent className="p-3">
```

**Changes to action buttons (full-width on mobile):**

The existing button layout uses `flex flex-nowrap gap-1.5 w-full` with `flex-1` on the Book Now button. This is already close to correct. The fix ensures the Details button also participates in full-width layout:

```tsx
<div className="flex gap-1.5 w-full">
  <Button
    size="sm"
    variant="outline"
    className="h-8 px-3 text-xs border-border text-foreground hover:bg-muted flex-1"
    onClick={handleViewDetails}
  >
    <Info className="h-3.5 w-3.5 mr-1" />
    Details
  </Button>
  <Button
    size="sm"
    className="flex-1 h-8 text-xs gradient-primary text-white border-none shadow-sm font-semibold"
    onClick={handleBookClick}
    disabled={isSoldOut}
  >
    {isSoldOut ? "Sold Out" : "Book Now"}
  </Button>
</div>
```

**Typography tokens applied:**

```tsx
// Event title — uses --font-h2 equivalent (text-sm font-semibold = 14px/600)
<h3 className="font-semibold text-sm mb-0.5 line-clamp-1 text-foreground">{event.title}</h3>

// Metadata — uses --font-small equivalent (text-[11px] = ~11px/400)
<div className="flex flex-col gap-1 text-[11px] text-muted-foreground mb-2">
```

### 5. `CustomerDashboard.tsx` — Layout and Grid

**Section order** (already correct in current implementation):
1. Search Header (location + text search)
2. Quick Services / Category Icons (horizontally scrollable)
3. Latest Bookings (conditional)
4. Admin Banners (promotional banner)
5. Featured Events (event grid)

The section order matches the requirement. The "Latest Bookings" section is conditional and only appears when the user has bookings, so it does not count as a mandatory above-the-fold section.

**Event grid responsive columns:**

```tsx
// Before
<div className="grid grid-cols-2 gap-2">

// After
<div className="grid gap-3"
  style={{
    gridTemplateColumns: "repeat(var(--event-grid-cols, 2), minmax(0, 1fr))"
  }}
  className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
>
```

Using Tailwind responsive prefixes:
- `grid-cols-1` — base (< 480px / mobile)
- `sm:grid-cols-2` — 480px+ (tablet, Tailwind `sm` = 640px; we use a custom breakpoint via inline style or override)
- `md:grid-cols-2` — 768px+ (desktop minimum)
- `lg:grid-cols-3` — 1024px+ (large desktop)

> **Breakpoint alignment note:** Tailwind's `sm` breakpoint is 640px, but the requirement specifies 480px for the tablet column switch. To hit exactly 480px, we use a CSS Grid approach with a media query in `index.css` or use the `min-[480px]:grid-cols-2` Tailwind arbitrary breakpoint syntax.

```tsx
<div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
```

**Spacing tokens applied to sections:**

```tsx
// Section gap — space-y-4 (16px = --space-lg)
<div className="space-y-4 animate-fade-in pb-4 px-3">

// Section headings use text-base font-bold (16px/700 ≈ --font-h1)
<h2 className="text-base font-display font-bold ...">

// Card internal padding — p-3 (12px = --space-md)
```

**Skeleton loading state:**

When `isLoading` is true for the events query, render skeleton cards instead of EventCards:

```tsx
{isLoading ? (
  <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
    ))}
  </div>
) : (
  <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
    {featuredEvents.map((event) => (
      <EventCard key={event.id} event={event} onBook={handleBookEvent} showActions="customer" />
    ))}
  </div>
)}
```

**Category Icons horizontal scroll:**

```tsx
<div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
  {/* chip items */}
</div>
```

The `scrollbar-hide` utility is already used in the current implementation.

---

## Data Models

No data model changes. This redesign is purely presentational. The existing `Event`, `Booking`, and `User` types from `@/data/mockData` are unchanged.

The only "data" change is the addition of CSS custom properties to `index.css`, which are static configuration values.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a UI/CSS redesign. Most acceptance criteria are structural checks (example-based). However, several criteria express universal rules that hold across a range of inputs (viewport widths, event data, padding values) and are suitable for property-based testing using **fast-check** (already installed as a dev dependency).

---

### Property 1: Exclusive Navigation by Viewport

*For any* viewport width, the DashboardLayout for a customer user SHALL render exactly one navigation mechanism — Bottom_Nav when width < 768px, Sidebar when width ≥ 768px — and never both simultaneously.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Full-Width Action Buttons in Single-Column Grid

*For any* EventCard rendered with `showActions="customer"` and an upcoming (non-cancelled, non-completed) event, both the "Details" and "Book Now" buttons SHALL have full-width styling (`flex-1` or `w-full`) so that they expand to fill the card's content area.

**Validates: Requirements 2.2**

---

### Property 3: EventCard Typography Token Application

*For any* EventCard rendered with any valid event data, the event title element SHALL use the `--font-h2` equivalent styling (font-semibold text-sm) and the metadata elements (date, location) SHALL use the `--font-small` equivalent styling (text-[11px] or smaller).

**Validates: Requirements 3.6**

---

### Property 4: Event Grid Gap Consistency

*For any* event grid rendered in CustomerDashboard, the grid container SHALL apply a gap of at least 12px (gap-3) between all adjacent cards, regardless of the number of events in the list.

**Validates: Requirements 4.5, 5.5**

---

### Property 5: Responsive Grid Column Count

*For any* viewport width, the CustomerDashboard event grid SHALL render the correct number of columns: exactly 1 column when width < 480px, exactly 2 columns when 480px ≤ width < 768px, and 2 or more columns when width ≥ 768px.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 6: Spacing Token Consistency

*For any* top-level section rendered in CustomerDashboard, the vertical gap between sections SHALL use `--space-lg` (16px), and *for any* card or list item rendered in CustomerDashboard, the internal padding SHALL use `--space-md` (12px).

**Validates: Requirements 6.2, 6.3**

---

### Property 7: Box-Sizing Prevents Overflow

*For any* padding value applied to EventCard child elements, the card SHALL not overflow its grid cell width. *For any* padding applied to BottomNavBar child items, the nav element SHALL maintain its declared height of 60px.

**Validates: Requirements 7.2, 7.3**

---

## Error Handling

Since this is a pure UI redesign with no new API calls or data mutations, error handling is limited to:

1. **Image load failures in EventCard** — already handled via `onError` fallback to `/placeholder.svg`. No change needed.
2. **Empty events list** — the current implementation renders nothing when `featuredEvents` is empty. The skeleton loading state covers the loading phase. An empty state message ("No events available") should be shown when `!isLoading && featuredEvents.length === 0`.
3. **CSS custom property fallbacks** — all `var(--token)` usages should include fallback values: `var(--space-md, 12px)`, `var(--space-lg, 16px)`, etc., to prevent layout breakage in environments where the CSS variables fail to load.

---

## Testing Strategy

### Dual Testing Approach

Unit/example tests verify specific structural requirements (DOM presence, class names, style attributes). Property-based tests verify universal invariants across generated inputs.

### Property-Based Testing

**Library:** `fast-check` (v4.6.0, already installed)
**Runner:** Vitest
**Minimum iterations:** 100 per property test
**Tag format:** `Feature: bookmyshow-mobile-ui-redesign, Property {N}: {property_text}`

Each correctness property maps to one property-based test:

| Property | Test Description | Generator |
|---|---|---|
| P1: Exclusive Navigation | For generated viewport widths, verify nav exclusivity | `fc.integer({ min: 200, max: 1400 })` |
| P2: Full-Width Buttons | For generated event data, verify button flex classes | `fc.record({ title: fc.string(), status: fc.constant('upcoming') })` |
| P3: EventCard Typography | For generated events, verify title/metadata class presence | `fc.record({ title: fc.string(), price: fc.integer({ min: 0 }) })` |
| P4: Grid Gap | For generated event lists (1–20 items), verify gap class | `fc.array(fc.record(...), { minLength: 1, maxLength: 20 })` |
| P5: Responsive Grid Columns | For generated viewport widths, verify column count | `fc.integer({ min: 200, max: 1400 })` |
| P6: Spacing Token Consistency | For generated section counts, verify spacing classes | `fc.integer({ min: 1, max: 8 })` |
| P7: Box-Sizing Overflow | For generated padding values, verify no overflow | `fc.integer({ min: 0, max: 48 })` |

### Unit / Example Tests

The following example-based tests cover structural requirements not suited for PBT:

- **BottomNavBar height** — verify `height: 60px` in style attribute
- **BottomNavBar items** — verify exactly 5 items with correct labels
- **BottomNavBar safe area** — verify `env(safe-area-inset-bottom)` in style
- **EventCard border-radius** — verify `rounded-xl` class on outermost element
- **EventCard shadow classes** — verify default and hover shadow classes
- **EventCard CardContent padding** — verify `p-3` class
- **CustomerDashboard section order** — verify DOM order of Search → Banner → Categories → Events
- **CustomerDashboard skeleton loading** — verify skeleton cards render when `isLoading=true`
- **CustomerDashboard category scroll** — verify `overflow-x-auto scrollbar-hide` on category container
- **CSS token definitions** — verify `--space-sm`, `--space-md`, `--space-lg`, `--font-size-h1`, etc. are defined in the stylesheet

### Test File Location

New tests are added to: `frontend/src/components/__tests__/bookmyshow-mobile-ui-redesign.test.tsx`

Existing test files (`mobile-navigation.test.tsx`, `mobile-ui-redesign.test.tsx`, `mobile-ui-redesign-preservation.test.tsx`) are preserved and must continue to pass.

### Running Tests

```bash
cd frontend && npm test
# or for single run:
cd frontend && npx vitest run
```
