# Implementation Plan: BookMyShow Mobile UI Redesign

## Overview

Targeted UI/CSS redesign of the customer-facing dashboard to deliver a BookMyShow-style mobile experience. The plan modifies five existing components (`DashboardLayout`, `BottomNavBar`, `EventCard`, `CustomerDashboard`, `AppSidebar`) and adds CSS custom property tokens to `index.css`. No backend or data model changes are required.

## Tasks

- [x] 1. Add CSS tokens and global box-sizing reset to `index.css`
  - Add spacing tokens `--space-sm: 8px`, `--space-md: 12px`, `--space-lg: 16px` to the `:root` block
  - Add typography tokens `--font-size-h1: 18px`, `--font-weight-h1: 600`, `--font-size-h2: 16px`, `--font-weight-h2: 600`, `--font-size-body: 14px`, `--font-weight-body: 400`, `--font-size-small: 12px`, `--font-weight-small: 400` to the `:root` block
  - Add `*, *::before, *::after { box-sizing: border-box; }` rule inside `@layer base`
  - _Requirements: 3.1, 6.1, 7.1_

- [x] 2. Fix `DashboardLayout.tsx` sidebar breakpoint and spacing tokens
  - Change sidebar wrapper from `hidden sm:flex` to `hidden md:flex` to unify the navigation breakpoint at 768px
  - Update `<main>` padding to use `var(--space-md, 12px)` for all sides and `var(--space-lg, 16px)` for non-main-page bottom padding
  - _Requirements: 1.1, 1.2, 6.5_

  - [ ]* 2.1 Write property test for exclusive navigation by viewport (Property 1)
    - **Property 1: Exclusive Navigation by Viewport**
    - For generated viewport widths (200–1400px), verify that a customer user sees Bottom_Nav when width < 768px and Sidebar when width ≥ 768px, never both simultaneously
    - Use `fc.integer({ min: 200, max: 1400 })` as the generator
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Update `BottomNavBar.tsx` — height, label, and safe area
  - Change `height` from `"70px"` to `"60px"` in the inline style of the `<nav>` element
  - Rename the "Settings" nav item label to "Profile" in the `navItems` array
  - Verify `paddingBottom: "env(safe-area-inset-bottom)"` is preserved on the `<nav>` element
  - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.1 Write unit tests for BottomNavBar structure
    - Verify `height: 60px` in the nav element's style attribute
    - Verify exactly 5 nav items are rendered with labels: Home, Events, Bookings, Billings, Profile
    - Verify `env(safe-area-inset-bottom)` is present in the nav element's style
    - Verify active item is visually distinguished using the primary brand color
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.2 Write property test for box-sizing height invariant (Property 7 — BottomNavBar)
    - **Property 7: Box-Sizing Prevents Overflow (BottomNavBar)**
    - For generated padding values (0–48px) applied to BottomNavBar child items, the nav element SHALL maintain its declared height of 60px
    - Use `fc.integer({ min: 0, max: 48 })` as the generator
    - **Validates: Requirements 7.3**

- [x] 4. Update `EventCard.tsx` — shadow values, full-width buttons, and typography
  - Update the outermost `<Card>` shadow from `shadow-[0_2px_6px_rgba(0,0,0,0.08)]` to `shadow-[0_2px_8px_rgba(0,0,0,0.08)]` and replace `hover:shadow-xl` with `hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)] transition-shadow duration-300`
  - Add `flex-1` to the "Details" button so both "Details" and "Book Now" buttons share full width equally inside `flex gap-1.5 w-full`
  - Confirm `<CardContent className="p-3">` is present (12px padding — already correct, verify no regression)
  - Confirm event title uses `font-semibold text-sm` and metadata uses `text-[11px]` (already correct, verify no regression)
  - _Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 3.6_

  - [ ]* 4.1 Write unit tests for EventCard design tokens
    - Verify `rounded-xl` class on the outermost Card element
    - Verify default shadow class `shadow-[0_2px_8px_rgba(0,0,0,0.08)]` on the Card
    - Verify hover shadow class `hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)]` on the Card
    - Verify `p-3` class on `CardContent`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write property test for full-width action buttons (Property 2)
    - **Property 2: Full-Width Action Buttons in Single-Column Grid**
    - For generated event data with `status: 'upcoming'` and `showActions="customer"`, both "Details" and "Book Now" buttons SHALL have `flex-1` class
    - Use `fc.record({ title: fc.string({ minLength: 1 }), status: fc.constant('upcoming'), price: fc.integer({ min: 0 }), eventDate: fc.constant(new Date().toISOString()), location: fc.constant('Test City'), image: fc.constant('/placeholder.svg'), category: fc.constant('Music') })` as the generator
    - **Validates: Requirements 2.2**

  - [ ]* 4.3 Write property test for EventCard typography tokens (Property 3)
    - **Property 3: EventCard Typography Token Application**
    - For generated event data, the event title element SHALL use `font-semibold text-sm` and metadata elements SHALL use `text-[11px]` or smaller
    - Use `fc.record({ title: fc.string({ minLength: 1 }), price: fc.integer({ min: 0 }), eventDate: fc.constant(new Date().toISOString()), location: fc.constant('Test City'), image: fc.constant('/placeholder.svg'), category: fc.constant('Music'), status: fc.constant('upcoming') })` as the generator
    - **Validates: Requirements 3.6**

- [x] 5. Update `CustomerDashboard.tsx` — responsive grid, section order, skeleton loading, and category scroll
  - Replace the Featured Events grid `<div className="grid grid-cols-2 gap-2">` with `<div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">` and switch from the custom inline card markup to `<EventCard>` components with `showActions="customer"`
  - Wrap the Featured Events grid in a conditional: when `isLoading` is true render 4 skeleton placeholder divs (`h-64 bg-muted animate-pulse rounded-xl`); when false render the event grid
  - Verify section DOM order is: Search Header → Promotional Banner → Category Icons (Quick Services) → Featured Events — reorder JSX if needed
  - Verify the category/quick-services container has `overflow-x-auto scrollbar-hide` classes for horizontal scroll without a visible scrollbar
  - Apply `space-y-4` (16px = `--space-lg`) as the top-level section gap on the outer wrapper `<div>`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.3, 8.4, 8.6_

  - [ ]* 5.1 Write unit tests for CustomerDashboard layout structure
    - Verify skeleton cards render when `isLoading=true` (mock the `useQuery` hook)
    - Verify `overflow-x-auto scrollbar-hide` classes on the category/quick-services container
    - Verify the Featured Events section renders `EventCard` components when data is loaded
    - _Requirements: 8.3, 8.4, 8.6_

  - [ ]* 5.2 Write property test for responsive grid column count (Property 5)
    - **Property 5: Responsive Grid Column Count**
    - For generated viewport widths, verify the grid container has `grid-cols-1` for < 480px, `min-[480px]:grid-cols-2` for 480–767px, and `md:grid-cols-2 lg:grid-cols-3` for ≥ 768px
    - Use `fc.integer({ min: 200, max: 1400 })` as the generator
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 5.3 Write property test for event grid gap consistency (Property 4)
    - **Property 4: Event Grid Gap Consistency**
    - For generated event lists (1–20 items), the grid container SHALL always have `gap-3` class (≥ 12px gap)
    - Use `fc.array(fc.record({ id: fc.uuid(), title: fc.string({ minLength: 1 }), price: fc.integer({ min: 0 }), eventDate: fc.constant(new Date().toISOString()), location: fc.constant('Test City'), image: fc.constant('/placeholder.svg'), category: fc.constant('Music'), status: fc.constant('upcoming') }), { minLength: 1, maxLength: 20 })` as the generator
    - **Validates: Requirements 4.5, 5.5**

  - [ ]* 5.4 Write property test for spacing token consistency (Property 6)
    - **Property 6: Spacing Token Consistency**
    - For generated section counts (1–8), the outer wrapper SHALL use `space-y-4` (16px = `--space-lg`) and card/list items SHALL use `p-3` (12px = `--space-md`)
    - Use `fc.integer({ min: 1, max: 8 })` as the generator
    - **Validates: Requirements 6.2, 6.3**

- [x] 6. Write property test for box-sizing overflow on EventCard (Property 7 — EventCard)
  - [x] 6.1 Write property test for EventCard box-sizing overflow (Property 7 — EventCard)
    - **Property 7: Box-Sizing Prevents Overflow (EventCard)**
    - For generated padding values (0–48px) applied to EventCard child elements, the card SHALL not overflow its grid cell width
    - Use `fc.integer({ min: 0, max: 48 })` as the generator
    - **Validates: Requirements 7.2**

- [x] 7. Checkpoint — Ensure all tests pass
  - Run `cd frontend && npx vitest run` and confirm all tests in `bookmyshow-mobile-ui-redesign.test.tsx` pass alongside existing test files (`mobile-navigation.test.tsx`, `mobile-ui-redesign.test.tsx`, `mobile-ui-redesign-preservation.test.tsx`)
  - Fix any TypeScript or lint errors surfaced by the build
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are purely presentational — no API, routing, or data model changes
- The `useIsMobile()` hook at `frontend/src/hooks/use-mobile.ts` (threshold < 768px) is already in the codebase and should be used for navigation gating in tests
- CSS custom properties should include fallback values: `var(--space-md, 12px)`, `var(--space-lg, 16px)`, etc.
- Test file location: `frontend/src/components/__tests__/bookmyshow-mobile-ui-redesign.test.tsx`
- Existing test files must continue to pass after all changes
- Property tests use `fast-check` (v4.6.0, already installed) with a minimum of 100 iterations per property
