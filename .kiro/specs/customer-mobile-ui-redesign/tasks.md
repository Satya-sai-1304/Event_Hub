# Implementation Plan: Customer Mobile UI Redesign

## Overview

Surgical modifications to four existing components — `BottomNavBar`, `DashboardLayout`, `CustomerDashboard`, and `EventCard` — to bring the customer-facing mobile UI to a production-grade standard. No new routes, no new API endpoints, no new data models. All changes are additive or replacement-level within the existing React/TypeScript/Tailwind stack.

## Tasks

- [x] 1. Update BottomNavBar with route allowlist and visibility logic
  - Add `MAIN_PAGES` constant array: `["/dashboard", "/dashboard/browse-events", "/dashboard/my-bookings", "/dashboard/profile-settings"]`
  - Derive `isMainPage` using `MAIN_PAGES.includes(location.pathname)` and return `null` when false
  - Verify nav items match the design spec (Settings at `/dashboard/profile-settings` as the 5th item — already correct)
  - Confirm icon `size={22}`, nav item height `60px`, and flex centering are in place (already correct — no changes needed)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.1 Write property test for BottomNavBar visibility on main pages
    - **Property 1: BottomNavBar visible on main pages**
    - Generator: sample from the 4-item `MAIN_PAGES` allowlist
    - Assert: component renders non-null result
    - **Validates: Requirements 2.1, 2.3**

  - [ ]* 1.2 Write property test for BottomNavBar hidden on inner pages
    - **Property 2: BottomNavBar hidden on inner pages**
    - Generator: arbitrary string path NOT in the allowlist (e.g. `/dashboard/saved-events`, `/dashboard/calendar`, random `/dashboard/x` paths)
    - Assert: component returns null / renders no DOM nodes
    - **Validates: Requirements 2.2, 2.4**

- [x] 2. Update DashboardLayout with BackButton and conditional bottom padding
  - Import `useLocation`, `useNavigate` from `react-router-dom` and `ChevronLeft` from `lucide-react`
  - Add the same `MAIN_PAGES` allowlist (or import from a shared constant) and derive `isMainPage`
  - Implement inline `BackButton` component: `ChevronLeft` icon + "Back" label, calls `navigate(-1)` on click, styled with `flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3`
  - Render `{!isMainPage && <BackButton />}` inside the `max-w-[1600px]` wrapper, above `<Outlet />`
  - Change `paddingBottom` on `<main>` to be conditional: `isMainPage ? "calc(76px + env(safe-area-inset-bottom, 0px))" : "16px"`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.2, 8.3_

  - [ ]* 2.1 Write property test for BackButton present on inner pages
    - **Property 3: BackButton present on inner pages**
    - Generator: arbitrary inner page path (not in `MAIN_PAGES`)
    - Assert: BackButton element is present in the rendered output
    - **Validates: Requirements 3.1, 3.5**

  - [ ]* 2.2 Write property test for BackButton absent on main pages
    - **Property 4: BackButton absent on main pages**
    - Generator: sample from `MAIN_PAGES` allowlist
    - Assert: no BackButton element in rendered output
    - **Validates: Requirements 3.6**

  - [ ]* 2.3 Write property test for DashboardLayout bottom padding by page type
    - **Property 10: DashboardLayout bottom padding by page type**
    - Generator: main page paths (from allowlist) and inner page paths (arbitrary non-allowlist paths)
    - Assert: main page → `paddingBottom` contains `76px`; inner page → `paddingBottom` is `16px`
    - **Validates: Requirements 8.2, 8.3**

- [x] 3. Checkpoint — Ensure BottomNavBar and DashboardLayout tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor CustomerDashboard — Quick Services section
  - Build `quickServiceItems` with `useMemo` combining `(categories || []).slice(0, 6)` mapped to `{ id, label, emoji: "✨", url }` and `(allServiceTypes || []).slice(0, 6)` mapped to `{ id, label, emoji: "🛠️", url }`, capped at 12 total
  - Replace the current `grid-cols-4` Quick Services layout with a horizontally scrollable flex row: `flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory`
  - Each card: `shrink-0 w-[72px] snap-start`, flex-col, emoji + truncated label (`text-[10px] font-semibold truncate w-full text-center`)
  - Navigation URLs: categories → `/dashboard/browse-events?category=${encodeURIComponent(cat.name)}&tab=events`; service types → `/dashboard/browse-events?tab=services&type=${encodeURIComponent(st.name)}`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.1 Write property test for Quick Services item count
    - **Property 5: Quick Services item count**
    - Generator: arrays of categories (length 0–8) and service types (length 0–8) where total >= 4
    - Assert: rendered Quick Services section contains >= 4 card buttons
    - **Validates: Requirements 4.2**

  - [ ]* 4.2 Write property test for Quick Services navigation correctness
    - **Property 6: Quick Services navigation correctness**
    - Generator: arbitrary category name string
    - Assert: clicking the category card calls navigate with a URL containing `/dashboard/browse-events` and the encoded category name
    - **Validates: Requirements 4.6**

- [x] 5. Refactor CustomerDashboard — section order, typography, and grid
  - Enforce section render order: Search Bar → Quick Services → Latest Bookings (conditional) → Banners → Pending Ratings Alert → Featured Events → Popular Vendors → Trending Gallery → All Events
  - Reduce all section heading sizes from `text-2xl` to `text-base font-display font-bold`
  - Remove section subtitle `<p>` elements (e.g. "Handpicked experiences just for you") to reduce vertical noise
  - Change Latest Bookings `space-y-6` wrapper to `space-y-3`
  - Change Featured Events grid gap from `gap-6` to `gap-3`; confirm grid columns are `grid-cols-2 lg:grid-cols-4`
  - Guard Latest Bookings section with `{myBookings.length > 0 && (...)}`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.5_

  - [ ]* 5.1 Write property test for Latest Bookings conditional rendering
    - **Property 7: Latest Bookings conditional rendering**
    - Generator: booking arrays of length 0 and length 1–10
    - Assert: section absent when length = 0, present when length >= 1
    - **Validates: Requirements 5.5, 5.6**

- [x] 6. Checkpoint — Ensure CustomerDashboard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Refactor EventCard — replace three-button row with two-button row
  - In the active event branch (not completed, not cancelled), replace the current three-button row (`Details + Book Now + Share`) with a two-button row
  - "Details" button: `size="sm" variant="outline"`, `className="h-8 px-3 text-xs border-border text-foreground hover:bg-muted shrink-0"`, always shows `<Info className="h-3.5 w-3.5 mr-1" />` + "Details" label (remove the `hidden xs:inline sm:hidden md:inline` span wrapping)
  - "Book Now" button: `size="sm"`, `className="flex-1 h-8 text-xs gradient-primary text-white border-none shadow-sm font-semibold"`, disabled + "Sold Out" text when `isSoldOut`
  - Remove the Share button from the primary action row (the `handleShare` function and heart/save button on the image can remain)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 7.1 Write property test for EventCard dual buttons for active events
    - **Property 8: EventCard dual buttons for active events**
    - Generator: events with status sampled from `{upcoming, live}` and arbitrary title/price/date
    - Assert: both "Details" and "Book Now" buttons present in rendered output
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 7.2 Write property test for sold-out button state
    - **Property 9: Sold-out button state**
    - Generator: events with `isSoldOut=true` and arbitrary other fields
    - Assert: "Book Now" is disabled and shows "Sold Out"; "Details" button is not disabled
    - **Validates: Requirements 6.4, 6.5**

- [x] 8. Update and extend mobile-navigation test file
  - Update `frontend/src/components/__tests__/mobile-navigation.test.tsx` to cover all 10 property-based tests using `fast-check`
  - Each `fc.assert(fc.property(...))` block must run a minimum of 100 iterations
  - Tag each test with the format: `Feature: customer-mobile-ui-redesign, Property {N}: {property_text}`
  - Add unit test examples: BottomNavBar renders 5 nav items, BackButton click calls `navigate(-1)`, EventCard Details button always enabled on sold-out event, CustomerDashboard grid has `grid-cols-2` class
  - _Requirements: 1.1, 1.2, 1.3, 2.1–2.4, 3.1–3.6, 4.2, 4.6, 5.5, 5.6, 6.1–6.5, 8.2, 8.3_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run the full test suite (`vitest --run`) and confirm all property-based and unit tests pass.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Properties 1–10 map directly to the Correctness Properties section in `design.md`
- The `MAIN_PAGES` allowlist must be identical in both `BottomNavBar.tsx` and `DashboardLayout.tsx` — consider extracting to a shared constant (e.g. `src/lib/navigation.ts`) to avoid drift
- `fast-check` is the PBT library; confirm it is installed (`npm ls fast-check`) before writing property tests
- The Share button removal from EventCard is intentional per design spec — share functionality remains accessible via the card image area if needed
