# Design Document: Mobile Responsive UI

## Overview

This design covers the mobile-first responsive overhaul of the EventHub React + TypeScript + Tailwind CSS frontend. The current UI renders as a scaled-down desktop layout on small screens. The goal is to apply Tailwind CSS responsive prefixes (`sm:`, `md:`, `lg:`) systematically across the affected components so that mobile users get a clean, usable experience without any change to desktop behavior.

The original approach (Requirements 1–9) is purely CSS-class-level — no new components, no new routes, no API changes. Requirements 10–13 introduce new components and layout changes:

- **BottomNavBar** (`BottomNavBar.tsx`): a new fixed bottom navigation component for mobile dashboard navigation
- **MobileDashboardHome** (`MobileDashboardHome.tsx`): a new mobile-optimized dashboard home page for customer role
- **BrowseEventsPage** search/grid fixes: hide location input on mobile, enforce 2-column grid with minimal padding
- **EventCard** mobile redesign: full-width "Book Now" button, hide Details/Share on mobile

Key design decisions:
- Mobile-first: base classes target mobile, breakpoint prefixes scale up
- No layout regressions on desktop — all existing `lg:` and `xl:` classes are preserved
- The existing `use-mobile` hook and shadcn `Sheet`/`Drawer` primitives are leveraged for the hamburger drawer
- The existing shadcn `Collapsible` primitive is used for the filter panel toggle
- BottomNavBar uses `sm:hidden` so it is invisible on tablet/desktop; AppSidebar uses `hidden sm:flex` wrapper so it is invisible on mobile
- MobileDashboardHome is rendered at `/dashboard` for customer role; the existing desktop dashboard remains unchanged for organizer/admin roles and for `sm:` and above

---

## Architecture

The feature touches only the presentation layer. No state management, routing, or API logic changes for Requirements 1–9. Requirements 10–13 add two new components and modify existing ones.

```
frontend/src/
├── components/
│   ├── EventCard.tsx              ← grid image, padding, typography, lazy loading, mobile redesign (Req 13)
│   ├── Navbar.tsx                 ← hamburger drawer, touch targets
│   ├── HeroSection.tsx            ← responsive heading/subtitle/stats
│   ├── DashboardLayout.tsx        ← main content padding, sidebar hide on mobile, bottom padding (Req 10)
│   ├── AppSidebar.tsx             ← hidden on mobile via wrapper class (Req 10)
│   └── BottomNavBar.tsx           ← NEW: fixed bottom nav, mobile only (Req 10)
├── pages/
│   ├── dashboard/
│   │   ├── BrowseEventsPage.tsx   ← search row, collapsible filters, grid gap, hide location on mobile (Req 12)
│   │   ├── MobileDashboardHome.tsx ← NEW: mobile-optimized home page (Req 11)
│   │   └── *Dashboard*.tsx        ← grid-cols-1 stats, overflow-x-auto tables
│   ├── BookTicketedEventPage.tsx  ← single-col layout, reduced image/padding
│   ├── BookFullServicePage.tsx    ← single-col layout, reduced image/padding
│   └── BookingPage.tsx            ← single-col layout, reduced image/padding
```

---

## Components and Interfaces

### EventCard.tsx

Current state: fixed `aspect-[16/10]` image, `p-5` padding, `text-lg` title, description always visible. Action buttons include Details, Book Now, and Share in a row.

Changes (Requirements 1, 2, 8, 13):
- Image container: `aspect-[4/3] sm:aspect-[16/10]` — shorter on mobile
- CardContent padding: `p-3 md:p-5`
- Title: `text-sm font-semibold line-clamp-2 md:text-lg md:line-clamp-1`
- Description: `hidden sm:block text-sm text-muted-foreground mb-3 line-clamp-2`
- Metadata row: `text-[10px] sm:text-xs`
- `<img>` tag: add `loading="lazy"`
- Status badge: already absolute top-left — keep as-is
- Price tag: already absolute bottom-left — keep as-is
- Heart icon: already absolute top-right — keep as-is
- Action buttons (customer, mobile): hide Details (`hidden sm:flex`) and Share (`hidden sm:flex`) buttons on mobile; render "Book Now" as `w-full` on mobile (`flex-1 sm:flex-1`)
- "Book Now" button: `w-full sm:flex-1 h-8 text-xs gradient-primary text-white`
- Completed/Cancelled state: full-width disabled indicator (`w-full`)
- Sold Out state: full-width disabled "Sold Out" button (`w-full`)

### Navbar.tsx

Current state: mobile menu is a dropdown `div` that slides in from top. Already has `lg:hidden` hamburger and `hidden lg:flex` desktop nav. The mobile menu items use `p-3` which gives ~44px touch targets.

Changes needed:
- Replace the inline dropdown mobile menu with a shadcn `Sheet` (slide-in drawer from the left or right) for a more native feel and proper overlay behavior
- Each nav item in the drawer: `min-h-[44px] flex items-center` to guarantee touch target size
- Close icon (`X`) already toggled via `mobileMenuOpen` state — keep as-is
- The hamburger button already has `lg:hidden` — no change needed

### HeroSection.tsx

Current state: `text-5xl md:text-8xl` heading, `text-lg md:text-2xl` subtitle, `gap-8 md:gap-16` stats, `text-3xl` stat values.

Changes:
- Heading: `text-4xl md:text-6xl lg:text-8xl`
- Subtitle: `text-base md:text-2xl`
- Stats container: `gap-6 md:gap-16`
- Stat value text: `text-2xl md:text-3xl`
- Search input: `h-10 md:h-14` (reduce height on mobile)
- Search button: `h-10 md:h-14`

### BrowseEventsPage.tsx

Current state: search inputs likely stacked or in a wide flex row; category chips always visible; grid gap fixed.

Changes (Requirements 3, 12):
- Search row: `flex flex-row gap-2` (already flex, ensure both inputs are `flex-1`)
- Location input wrapper: `hidden sm:flex flex-1` — hidden on mobile, visible on sm+
- Input height: `h-9 sm:h-10`
- Category chips + advanced filters: wrap in a `Collapsible` controlled by a "Filters" button, visible by default on `sm:` and above, collapsed on mobile
- Grid container: `px-2 sm:px-4 lg:px-6` — minimal side padding on mobile (max 8px each side)
- Grid gap: `gap-2 sm:gap-4 lg:gap-6`
- Grid columns: `grid-cols-2` on mobile (enforced as base class), `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Section spacing: `mb-3 sm:mb-6`

### BookTicketedEventPage.tsx / BookFullServicePage.tsx / BookingPage.tsx

Current state: `grid grid-cols-1 lg:grid-cols-3 gap-8` outer layout (already correct for mobile), but inner cards use `p-8`, hero image is `h-[400px]`, heading is `text-5xl`, contact fields are `grid-cols-1 sm:grid-cols-3`.

Changes:
- Hero image container: `h-48 sm:h-64 lg:h-[400px]`
- Hero image: add `object-cover`
- Page heading (inside hero): `text-xl sm:text-3xl lg:text-5xl font-black`
- CardContent padding: `p-4 sm:p-6 lg:p-8`
- Contact fields grid: `grid-cols-1 sm:grid-cols-3` (already correct — verify and keep)
- Input height: `h-10` (remove `h-12` or `h-16` where present)
- Outer container: `px-3 py-4 sm:px-4 sm:py-8 lg:px-8`

### DashboardLayout.tsx

Current state: `p-4 md:p-8` on main. AppSidebar always rendered.

Changes (Requirements 7, 10):
- Main padding: `p-3 md:p-4 lg:p-8`
- Add `pb-16 sm:pb-0` to main content area on mobile to prevent BottomNavBar overlap
- Wrap `<AppSidebar />` in `<div className="hidden sm:flex">` so it is hidden on mobile
- Render `<BottomNavBar />` after the main content area (outside the scrollable main), visible only on mobile via `sm:hidden` on the component itself

### Dashboard Pages (AdminDashboard, AnalyticsPage, BookingsPage, etc.)

Changes:
- Stats grids: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6`
- Table wrappers: wrap `<table>` in `<div className="overflow-x-auto">`
- Non-essential `<th>` / `<td>` columns: add `hidden sm:table-cell`
- Page headings: `text-lg sm:text-2xl font-bold`
- Section spacing: `space-y-4 lg:space-y-8`

---

### BottomNavBar.tsx (NEW — Requirement 10)

A new component rendered inside `DashboardLayout` below the main content area.

```tsx
// frontend/src/components/BottomNavBar.tsx
```

Structure:
- Root: `fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background border-t border-border`
- Inner: `flex items-center justify-around h-14 px-2`
- Each nav item: `flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] cursor-pointer`
- Icon: `h-5 w-5` — active: `text-primary`, inactive: `text-muted-foreground`
- Label: `text-[10px]` — active: `text-primary font-medium`, inactive: `text-muted-foreground`

Nav items (customer role):

| Label | Icon | Route |
|-------|------|-------|
| Home | `LayoutDashboard` | `/dashboard` |
| Events | `Search` | `/dashboard/browse-events` |
| Bookings | `Ticket` | `/dashboard/my-bookings` |
| Billings | `CreditCard` | `/dashboard/billing-payments` |
| Settings | `UserCog` | `/dashboard/profile-settings` |

Active state detection: use `useLocation()` from react-router-dom; compare `location.pathname` to each item's route. Use `NavLink` from react-router-dom with `className` callback for active styling.

The component uses `useAuth()` to determine role. For non-customer roles (organizer, admin), the BottomNavBar renders a simplified set of 5 items appropriate to that role, or can be hidden entirely — implementation may default to customer links for simplicity.

---

### MobileDashboardHome.tsx (NEW — Requirement 11)

A new page component rendered at `/dashboard` for customer role on mobile. The existing desktop dashboard page remains unchanged and is shown on `sm:` and above.

```tsx
// frontend/src/pages/dashboard/MobileDashboardHome.tsx
```

Structure:
```
<div className="px-4 py-4 space-y-6">
  {/* Search bar */}
  <Input placeholder="Search events…" className="h-10 w-full" />

  {/* Upcoming Events */}
  <section>
    <h2 className="text-base font-semibold mb-3">Upcoming Events</h2>
    <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
      {/* EventCard items, each w-[160px] shrink-0 */}
    </div>
  </section>

  {/* Popular Categories */}
  <section>
    <h2 className="text-base font-semibold mb-3">Popular Categories</h2>
    <div className="grid grid-cols-2 gap-3">
      {/* Category cards */}
    </div>
  </section>
</div>
```

Data: reuse existing API calls (`/events?status=upcoming&limit=10`) and category data already used in `BrowseEventsPage`. No new API endpoints.

The component is rendered conditionally in `DashboardLayout` or via a route wrapper: on mobile (`isMobile` from `use-mobile` hook), the `/dashboard` route renders `MobileDashboardHome`; on desktop it renders the existing dashboard page. Alternatively, `MobileDashboardHome` can be a section within the existing dashboard page that is `block sm:hidden`.

Preferred approach: render `MobileDashboardHome` as a `block sm:hidden` section at the top of the existing customer dashboard page, and wrap the existing desktop content in `hidden sm:block`. This avoids route changes.

---

---

## Data Models

No data model changes. This feature is purely presentational.

The only "state" additions are:
- `filtersOpen: boolean` in `BrowseEventsPage` — controls the collapsible filter panel on mobile (already has filter-related state; this is a new `useState(false)` toggle)
- `mobileMenuOpen: boolean` in `Navbar` — already exists
- No new state in `BottomNavBar` — active state is derived from `useLocation()` on every render
- No new state in `MobileDashboardHome` — data fetched via existing React Query hooks

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Filter toggle inverts visibility

*For any* rendered BrowseEventsPage where the filter panel is in a given visibility state, clicking the "Filters" toggle button should result in the filter panel being in the opposite visibility state.

**Validates: Requirements 3.3**

### Property 2: No unresponsive large text classes on headings

*For any* page-level heading element rendered by the system, if it carries a text-size class of `text-3xl` or larger, that class must be accompanied by a responsive breakpoint prefix (e.g., `sm:text-3xl`, `lg:text-5xl`) — no bare large text class should appear without a mobile-first base class.

**Validates: Requirements 4.3, 4.4**

### Property 3: Hamburger menu open/close round-trip

*For any* Navbar rendered in the default (public) variant, opening the mobile menu and then closing it (either via the X button or by clicking a nav link) should return the menu to its closed state, with the hamburger icon visible and the X icon hidden.

**Validates: Requirements 6.2, 6.3, 6.5**

### Property 4: Mobile nav items meet minimum touch target size

*For any* navigation item rendered inside the mobile menu drawer, the rendered element should have a minimum height of 44px to meet touch target accessibility requirements.

**Validates: Requirements 6.4**

### Property 5: Event card images use lazy loading

*For any* EventCard rendered with any event data, the `<img>` element inside the card should have the `loading="lazy"` attribute set.

**Validates: Requirements 8.1**

### Property 6: Dashboard stats grids default to single column

*For any* dashboard page that renders a statistics or summary grid, the grid container's base (mobile) class should be `grid-cols-1`, with larger column counts only applied at `sm:` or `lg:` breakpoints.

**Validates: Requirements 9.2**

### Property 7: Dashboard table wrappers have horizontal scroll

*For any* data table rendered in a dashboard page, the immediate wrapper element should have the `overflow-x-auto` class to prevent layout overflow on narrow viewports.

**Validates: Requirements 9.3**

### Property 8: BottomNavBar is hidden on non-mobile viewports

*For any* rendered DashboardLayout, the BottomNavBar element should carry the `sm:hidden` class (or equivalent), ensuring it is never visible at the `sm` breakpoint and above.

**Validates: Requirements 10.1, 10.2**

### Property 9: BottomNavBar active item matches current route

*For any* route within the dashboard, the BottomNavBar item whose route matches the current `location.pathname` should have the primary color class applied to both its icon and label, and no other item should have the primary color class.

**Validates: Requirements 10.5, 10.6**

### Property 10: Location search hidden on mobile in BrowseEventsPage

*For any* rendered BrowseEventsPage on a mobile viewport, the location search input wrapper should carry the `hidden` base class (with `sm:flex` to restore it at larger breakpoints), ensuring it is not visible on mobile.

**Validates: Requirement 12.1**

### Property 11: EventCard "Book Now" is full-width on mobile

*For any* EventCard rendered with a bookable event (status not completed/cancelled, not sold out), the "Book Now" button should carry the `w-full` class as its base (mobile-first) width class.

**Validates: Requirements 13.7**

---

## Error Handling

This feature introduces no new error states. The only risk areas are:

- **Collapsible filter panel**: if the `Collapsible` component from shadcn fails to render (e.g., missing import), the filters would be permanently hidden on mobile. Mitigation: fall back to always-visible filters if the toggle state is undefined.
- **Sheet/Drawer for mobile nav**: if the Sheet component is unavailable, the existing inline dropdown mobile menu remains functional as a fallback. The existing implementation already works; the Sheet upgrade is an enhancement.
- **Image lazy loading**: `loading="lazy"` is a progressive enhancement. Browsers that don't support it will simply load images eagerly — no error state.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required for comprehensive coverage.

**Unit tests** cover:
- Specific class presence checks (e.g., EventCard renders `p-3` on mobile, `hidden sm:block` on description)
- Specific interaction examples (e.g., hamburger click opens menu, nav link click closes menu)
- Specific breakpoint class checks (e.g., hero heading has `text-4xl md:text-6xl lg:text-8xl`)
- Edge cases (e.g., EventCard with no image still renders with correct aspect ratio class)

**Property-based tests** cover the 7 correctness properties above, verifying universal behaviors across randomized inputs.

### Unit Testing

Use **Vitest** + **React Testing Library** (already in the project).

Key unit test examples:
- `EventCard` renders `loading="lazy"` on the img element
- `EventCard` description has `hidden sm:block` class
- `EventCard` CardContent has `p-3` base padding class
- `Navbar` hamburger button has `lg:hidden` class
- `Navbar` desktop nav has `hidden lg:flex` class
- `HeroSection` h1 has `text-4xl` base class
- `BrowseEventsPage` search container has `flex` class
- `DashboardLayout` main has `p-3` base padding class

### Property-Based Testing

Use **fast-check** (install: `npm install --save-dev fast-check`).

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: mobile-responsive-ui, Property {N}: {property_text}`

**Property 1 — Filter toggle inverts visibility**
```
// Feature: mobile-responsive-ui, Property 1: Filter toggle inverts visibility
fc.assert(fc.property(fc.boolean(), (initialOpen) => {
  // Render BrowseEventsPage with filtersOpen = initialOpen
  // Click the Filters toggle button
  // Assert filtersOpen is now !initialOpen
}), { numRuns: 100 });
```

**Property 2 — No unresponsive large text classes**
```
// Feature: mobile-responsive-ui, Property 2: No unresponsive large text classes on headings
fc.assert(fc.property(fc.constantFrom(...pageComponents), (Component) => {
  const { container } = render(<Component />);
  const headings = container.querySelectorAll('h1, h2, h3');
  // For each heading, if className contains text-3xl or larger without a prefix, fail
}), { numRuns: 100 });
```

**Property 3 — Hamburger menu round-trip**
```
// Feature: mobile-responsive-ui, Property 3: Hamburger menu open/close round-trip
fc.assert(fc.property(fc.nat({ max: navLinks.length - 1 }), (linkIndex) => {
  // Render Navbar, click hamburger, click link at linkIndex
  // Assert mobile menu is closed and hamburger icon is visible
}), { numRuns: 100 });
```

**Property 4 — Touch target minimum size**
```
// Feature: mobile-responsive-ui, Property 4: Mobile nav items meet minimum touch target size
fc.assert(fc.property(fc.nat({ max: navLinks.length - 1 }), (linkIndex) => {
  // Render open mobile menu, get nav item at linkIndex
  // Assert computed height >= 44
}), { numRuns: 100 });
```

**Property 5 — Event card images use lazy loading**
```
// Feature: mobile-responsive-ui, Property 5: Event card images use lazy loading
fc.assert(fc.property(arbitraryEvent(), (event) => {
  const { container } = render(<EventCard event={event} />);
  const img = container.querySelector('img');
  return img?.getAttribute('loading') === 'lazy';
}), { numRuns: 100 });
```

**Property 6 — Dashboard stats grids default to single column**
```
// Feature: mobile-responsive-ui, Property 6: Dashboard stats grids default to single column
fc.assert(fc.property(fc.constantFrom(...dashboardPages), (Page) => {
  const { container } = render(<Page />);
  const grids = container.querySelectorAll('[class*="grid-cols-"]');
  // For each stats grid, assert base class is grid-cols-1
}), { numRuns: 100 });
```

**Property 7 — Dashboard table wrappers have horizontal scroll**
```
// Feature: mobile-responsive-ui, Property 7: Dashboard table wrappers have horizontal scroll
fc.assert(fc.property(fc.constantFrom(...dashboardPages), (Page) => {
  const { container } = render(<Page />);
  const tables = container.querySelectorAll('table');
  return Array.from(tables).every(t => t.parentElement?.classList.contains('overflow-x-auto'));
}), { numRuns: 100 });
```

**Property 8 — BottomNavBar is hidden on non-mobile viewports**
```
// Feature: mobile-responsive-ui, Property 8: BottomNavBar is hidden on non-mobile viewports
fc.assert(fc.property(fc.constant(null), () => {
  const { container } = render(<DashboardLayout />);
  const bottomNav = container.querySelector('[data-testid="bottom-nav-bar"]');
  return bottomNav?.classList.contains('sm:hidden') === true;
}), { numRuns: 100 });
```

**Property 9 — BottomNavBar active item matches current route**
```
// Feature: mobile-responsive-ui, Property 9: BottomNavBar active item matches current route
fc.assert(fc.property(fc.constantFrom('/dashboard', '/dashboard/browse-events', '/dashboard/my-bookings', '/dashboard/billing-payments', '/dashboard/profile-settings'), (route) => {
  // Render BottomNavBar with mocked location = route
  // Assert exactly one item has text-primary class
  // Assert that item's route matches the mocked location
}), { numRuns: 100 });
```

**Property 10 — Location search hidden on mobile in BrowseEventsPage**
```
// Feature: mobile-responsive-ui, Property 10: Location search hidden on mobile in BrowseEventsPage
fc.assert(fc.property(fc.constant(null), () => {
  const { container } = render(<BrowseEventsPage />);
  const locationWrapper = container.querySelector('[data-testid="location-search-wrapper"]');
  return locationWrapper?.classList.contains('hidden') === true;
}), { numRuns: 100 });
```

**Property 11 — EventCard Book Now is full-width on mobile**
```
// Feature: mobile-responsive-ui, Property 11: EventCard Book Now is full-width on mobile
fc.assert(fc.property(arbitraryBookableEvent(), (event) => {
  const { container } = render(<EventCard event={event} showActions="customer" />);
  const bookBtn = container.querySelector('button[data-testid="book-now-btn"]');
  return bookBtn?.classList.contains('w-full') === true;
}), { numRuns: 100 });
```
