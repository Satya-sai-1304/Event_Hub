# Implementation Plan: Mobile Navigation Restructure

## Overview

Modify `AppSidebar.tsx` to serve secondary-only content for customers on mobile, add auto-close behavior on item click, and verify `BottomNavBar.tsx` and `DashboardLayout.tsx` are already correct. Write property-based tests using fast-check for all 7 correctness properties.

## Tasks

- [x] 1. Update AppSidebar.tsx — mobile-aware customer link set
  - [x] 1.1 Import `useIsMobile` from `@/hooks/use-mobile` and destructure `setOpenMobile` from `useSidebar()`
    - Add `useIsMobile` import alongside existing hook imports
    - Destructure `setOpenMobile` from the existing `useSidebar()` call (currently only `state` is destructured)
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Define `customerSecondaryLinks` array and branch link selection on `isMobile`
    - Add `customerSecondaryLinks` constant containing only `{ title: "Help & Support", url: "/dashboard/help", icon: HelpCircle }`
    - Replace the single-line `links` assignment with the mobile-aware branch:
      ```ts
      const isMobile = useIsMobile();
      const links = user?.role === "admin"
        ? adminLinks
        : (user?.role === "organizer" || user?.role === "merchant")
          ? organizerLinks
          : (user?.role === "customer" && isMobile)
            ? customerSecondaryLinks
            : customerLinks;
      ```
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

  - [x] 1.3 Add "Account" `SidebarGroupLabel` for customer mobile secondary items
    - Wrap the `SidebarGroupContent` in a conditional: when `user?.role === "customer" && isMobile`, render a `SidebarGroupLabel` with text "Account" above the menu items
    - _Requirements: 2.3_

  - [x] 1.4 Add `onClick={() => setOpenMobile(false)}` to every `SidebarMenuButton`
    - Add the `onClick` handler to the `RouterNavLink` inside each `SidebarMenuButton` so the sidebar closes immediately on any item tap
    - Also add `onClick={() => { setOpenMobile(false); logout(); }}` to the logout `Button` in `SidebarFooter`, replacing the bare `onClick={logout}`
    - _Requirements: 4.1, 4.2_

- [x] 2. Verify DashboardLayout.tsx and BottomNavBar.tsx require no changes
  - [x] 2.1 Confirm `DashboardLayout` has `pb-16 sm:pb-4` on the `main` element and `hidden sm:flex` on the sidebar wrapper
    - Both are already present — no edits needed; document as confirmed
    - _Requirements: 6.3_

  - [x] 2.2 Confirm `BottomNavBar` has exactly five items in the correct order and is role-gated to customers
    - Items already match: Home, Events, Bookings, Billings, Settings — no edits needed
    - _Requirements: 1.1, 1.5_

- [x] 3. Checkpoint — verify the app renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write property-based tests for all 7 correctness properties
  - [x] 4.1 Set up test file and fast-check dependency
    - Create `frontend/src/components/__tests__/mobile-navigation.test.tsx`
    - Ensure `fast-check` is available (`npm install --save-dev fast-check` if not already installed)
    - Set up shared test utilities: mock `AuthContext`, mock `useSidebar`, mock `useIsMobile`, mock `react-router-dom` NavLink/useLocation
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4, 4.1, 5.3_

  - [ ]* 4.2 Write property test for Property 1 — BottomNavBar renders exactly five items in correct order
    - **Property 1: BottomNavBar renders exactly five items in correct order**
    - **Validates: Requirements 1.1**
    - Use `fc.constant(customerUser)` and assert 5 links with labels `['Home', 'Events', 'Bookings', 'Billings', 'Settings']`

  - [ ]* 4.3 Write property test for Property 2 — BottomNavBar is role-gated to customers only
    - **Property 2: BottomNavBar is role-gated to customers only**
    - **Validates: Requirements 1.5**
    - Use `fc.constantFrom('organizer', 'admin', 'merchant')` and assert `container` is empty

  - [ ]* 4.4 Write property test for Property 3 — BottomNavBar active state reflects current route
    - **Property 3: BottomNavBar active state reflects current route**
    - **Validates: Requirements 1.3, 1.4**
    - Use `fc.constantFrom` over the five nav item `to` values; assert the matching item has `text-primary` class and others do not

  - [ ]* 4.5 Write property test for Property 4 — Customer mobile sidebar contains only secondary items
    - **Property 4: Customer mobile sidebar contains only secondary items**
    - **Validates: Requirements 2.1, 2.2, 5.1, 5.2**
    - Mock `useIsMobile` to return `true`; assert none of the five primary route labels appear in the rendered sidebar

  - [ ]* 4.6 Write property test for Property 5 — Non-customer sidebar link sets are unchanged
    - **Property 5: Non-customer sidebar link sets are unchanged**
    - **Validates: Requirements 2.4**
    - Use `fc.constantFrom('organizer', 'admin')`; assert rendered links count is greater than 5

  - [ ]* 4.7 Write property test for Property 6 — No duplicate navigation destinations
    - **Property 6: No duplicate navigation destinations between BottomNavBar and customer mobile sidebar**
    - **Validates: Requirements 5.3**
    - Assert the intersection of `navItems` routes and `customerSecondaryLinks` routes is empty

  - [ ]* 4.8 Write property test for Property 7 — Sidebar closes on any item tap
    - **Property 7: Sidebar closes on any item tap**
    - **Validates: Requirements 4.1**
    - Use `fc.constantFrom` over `customerSecondaryLinks`; mock `setOpenMobile`; fire click and assert called with `false`

- [x] 5. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The only file requiring code changes is `AppSidebar.tsx` — `DashboardLayout.tsx` and `BottomNavBar.tsx` are already correct
- Property tests use fast-check with a minimum of 100 runs each
- `useIsMobile` should be mocked in tests to control mobile/desktop branching
