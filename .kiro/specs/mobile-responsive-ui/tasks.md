# Implementation Tasks: Mobile Responsive UI

## Task List

- [ ] 1. EventCard — Mobile Responsive Redesign
  - [ ] 1.1 Update image container to `aspect-[4/3] sm:aspect-[16/10]` and add `loading="lazy"` to `<img>`
  - [ ] 1.2 Update CardContent padding to `p-3 md:p-5`
  - [ ] 1.3 Update title to `text-sm font-semibold line-clamp-2 md:text-lg md:line-clamp-1`
  - [ ] 1.4 Add `hidden sm:block` to description paragraph
  - [ ] 1.5 Update metadata row to `text-[10px] sm:text-xs`
  - [ ] 1.6 Redesign customer action buttons: hide Details and Share on mobile (`hidden sm:flex`), render "Book Now" as `w-full` on mobile
  - [ ] 1.7 Ensure completed/cancelled/sold-out states use `w-full` disabled indicators on mobile

- [ ] 2. Navbar — Hamburger Drawer
  - [ ] 2.1 Replace inline dropdown mobile menu with shadcn `Sheet` slide-in drawer
  - [ ] 2.2 Ensure each nav item in the drawer has `min-h-[44px] flex items-center`
  - [ ] 2.3 Verify hamburger button has `lg:hidden` and desktop nav has `hidden lg:flex`

- [ ] 3. HeroSection — Responsive Typography and Spacing
  - [ ] 3.1 Update heading to `text-4xl md:text-6xl lg:text-8xl`
  - [ ] 3.2 Update subtitle to `text-base md:text-2xl`
  - [ ] 3.3 Update stats container to `gap-6 md:gap-16` and stat values to `text-2xl md:text-3xl`
  - [ ] 3.4 Update search input and button height to `h-10 md:h-14`

- [ ] 4. BrowseEventsPage — Search, Grid, and Filter Fixes
  - [ ] 4.1 Wrap location search input in `hidden sm:flex flex-1` to hide it on mobile
  - [ ] 4.2 Enforce `grid-cols-2` as base grid column class (mobile-first)
  - [ ] 4.3 Update grid container padding to `px-2 sm:px-4 lg:px-6`
  - [ ] 4.4 Update grid gap to `gap-2 sm:gap-4 lg:gap-6`
  - [ ] 4.5 Wrap category chips and advanced filters in a `Collapsible` with a "Filters" toggle button
  - [ ] 4.6 Update search input height to `h-9 sm:h-10`

- [ ] 5. Booking Forms — Mobile Layout
  - [ ] 5.1 Update hero image container to `h-48 sm:h-64 lg:h-[400px]` with `object-cover` in BookTicketedEventPage
  - [ ] 5.2 Update page heading to `text-xl sm:text-3xl lg:text-5xl font-black` in BookTicketedEventPage
  - [ ] 5.3 Update CardContent padding to `p-4 sm:p-6 lg:p-8` in BookTicketedEventPage
  - [ ] 5.4 Update outer container to `px-3 py-4 sm:px-4 sm:py-8 lg:px-8` in BookTicketedEventPage
  - [ ] 5.5 Apply same hero image, heading, padding, and container changes to BookFullServicePage
  - [ ] 5.6 Apply same hero image, heading, padding, and container changes to BookingPage
  - [ ] 5.7 Update input heights to `h-10` (remove `h-12`/`h-16`) across all booking forms

- [ ] 6. DashboardLayout — Mobile Padding and Sidebar Visibility
  - [ ] 6.1 Update main content padding to `p-3 md:p-4 lg:p-8`
  - [ ] 6.2 Add `pb-16 sm:pb-0` to main content area to prevent BottomNavBar overlap
  - [ ] 6.3 Wrap `<AppSidebar />` in `<div className="hidden sm:flex">` to hide it on mobile

- [ ] 7. Dashboard Pages — Stats Grids, Tables, and Headings
  - [ ] 7.1 Update stats/summary grids to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6`
  - [ ] 7.2 Wrap all `<table>` elements in `<div className="overflow-x-auto">`
  - [ ] 7.3 Add `hidden sm:table-cell` to non-essential table columns
  - [ ] 7.4 Update page headings to `text-lg sm:text-2xl font-bold`
  - [ ] 7.5 Update section spacing to `space-y-4 lg:space-y-8`

- [ ] 8. BottomNavBar Component (NEW)
  - [ ] 8.1 Create `frontend/src/components/BottomNavBar.tsx` with fixed bottom positioning and `sm:hidden`
  - [ ] 8.2 Implement 5 nav items: Home, Events, Bookings, Billings, Settings with icons and labels
  - [ ] 8.3 Implement active state detection using `useLocation()` — primary color for active, muted for inactive
  - [ ] 8.4 Ensure each nav item has minimum touch target height of 56px
  - [ ] 8.5 Render `<BottomNavBar />` inside `DashboardLayout` below the main content area

- [ ] 9. MobileDashboardHome Page (NEW)
  - [ ] 9.1 Create `frontend/src/pages/dashboard/MobileDashboardHome.tsx` with search bar, Upcoming Events, and Popular Categories sections
  - [ ] 9.2 Implement horizontally scrollable Upcoming Events row using existing event API query
  - [ ] 9.3 Implement Popular Categories 2-column grid using existing category data
  - [ ] 9.4 Integrate MobileDashboardHome into the customer dashboard page as `block sm:hidden` section, wrapping existing desktop content in `hidden sm:block`
  - [ ] 9.5 Add empty state message for Upcoming Events when no events are available

- [ ] 10. Responsive Typography — Page-Level Headings
  - [ ] 10.1 Replace bare `text-3xl` or larger heading classes with responsive equivalents (`text-xl sm:text-2xl lg:text-3xl`) across all page components
  - [ ] 10.2 Replace bare `text-5xl` or larger heading classes with responsive equivalents (`text-2xl sm:text-4xl lg:text-5xl`) across all page components

- [ ] 11. Spacing and Layout — Global Padding and Gaps
  - [ ] 11.1 Update page-level container padding to `px-3 py-4 sm:px-6 sm:py-8 lg:px-8` across public pages
  - [ ] 11.2 Replace fixed `gap-8`/`gap-10` in grid/flex layouts with `gap-3 sm:gap-6 lg:gap-8`
  - [ ] 11.3 Update section spacing to `space-y-4 sm:space-y-8` across affected pages

- [ ] 12. Tests — Unit Tests
  - [ ] 12.1 Write unit tests for EventCard: `loading="lazy"`, `hidden sm:block` description, `p-3` padding, `w-full` Book Now button on mobile
  - [ ] 12.2 Write unit tests for Navbar: hamburger `lg:hidden`, desktop nav `hidden lg:flex`, Sheet opens/closes
  - [ ] 12.3 Write unit tests for HeroSection: `text-4xl` base heading class
  - [ ] 12.4 Write unit tests for DashboardLayout: `p-3` base padding, `pb-16` bottom padding, sidebar hidden on mobile
  - [ ] 12.5 Write unit tests for BottomNavBar: `sm:hidden` class present, active item has primary color, touch target height >= 56px
  - [ ] 12.6 Write unit tests for BrowseEventsPage: location input has `hidden` base class, grid has `grid-cols-2` base class, `px-2` container padding

- [ ] 13. Tests — Property-Based Tests
  - [ ] 13.1 Property 1: Filter toggle inverts visibility (BrowseEventsPage)
  - [ ] 13.2 Property 2: No unresponsive large text classes on headings
  - [ ] 13.3 Property 3: Hamburger menu open/close round-trip (Navbar)
  - [ ] 13.4 Property 4: Mobile nav items meet minimum touch target size (Navbar)
  - [ ] 13.5 Property 5: Event card images use lazy loading (EventCard)
  - [ ] 13.6 Property 6: Dashboard stats grids default to single column
  - [ ] 13.7 Property 7: Dashboard table wrappers have horizontal scroll
  - [ ] 13.8 Property 8: BottomNavBar is hidden on non-mobile viewports
  - [ ] 13.9 Property 9: BottomNavBar active item matches current route
  - [ ] 13.10 Property 10: Location search hidden on mobile in BrowseEventsPage
  - [ ] 13.11 Property 11: EventCard Book Now is full-width on mobile
