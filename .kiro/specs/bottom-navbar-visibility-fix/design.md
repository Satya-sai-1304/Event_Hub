# Bottom Navbar Visibility Fix — Bugfix Design

## Overview

Three related bugs degrade the mobile bottom navigation bar experience for customers:

1. The navbar lacks route-based visibility logic — it shows on flow pages (`/dashboard/booking/:id`, `/dashboard/checkout`, `/dashboard/payment`) where it should be hidden, and the absence of explicit hide logic means the intent is unclear.
2. The navbar renders at 60px without `env(safe-area-inset-bottom)` padding and without enforced `100vw` width, causing it to be partially obscured by device chrome on iOS/Android.
3. The `AppSidebar` renders the full `customerLinks` list (9 items) on mobile, duplicating the 5 primary nav items already provided by the bottom navbar.

The fix is minimal and targeted: add a flow-page hide check to `BottomNavBar`, update its styles for safe-area and width, fix `DashboardLayout` to use `100dvh`, and conditionally render only `customerSecondaryLinks` in `AppSidebar` for mobile customers.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger any of the three bugs
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behaviors that must remain unchanged after the fix
- **isBugCondition**: Pseudocode function identifying buggy inputs
- **flow pages**: Routes `/dashboard/booking/:id`, `/dashboard/checkout`, `/dashboard/payment` — multi-step process pages where the bottom navbar should be hidden
- **main nav pages**: Routes `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, `/dashboard/profile-settings`
- **customerLinks**: The 9-item primary navigation list rendered in `AppSidebar` for customers
- **customerSecondaryLinks**: Secondary links (e.g. Help & Support) that do not duplicate bottom navbar items
- **100dvh**: CSS dynamic viewport height unit that accounts for collapsible browser toolbars on mobile

## Bug Details

### Bug Condition

The bugs manifest across three components. The combined bug condition covers: (a) the navbar rendering on flow pages, (b) the navbar rendering with incorrect dimensions/padding, and (c) the sidebar duplicating primary nav items for mobile customers.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context = { pathname: string, isMobile: boolean, userRole: string }
  OUTPUT: boolean

  isFlowPage := pathname STARTS_WITH "/dashboard/booking"
             OR pathname STARTS_WITH "/dashboard/checkout"
             OR pathname STARTS_WITH "/dashboard/payment"

  isNavbarDimensionBug := navbarHeight = 60px
                       AND navbarPaddingBottom DOES_NOT_CONTAIN "env(safe-area-inset-bottom)"
                       AND (navbarWidth != "100vw" OR navbarMaxWidth != "100vw")

  isLayoutBug := outerContainerMinHeight = "100vh"
              OR innerContainerMinHeight = "100vh"

  isSidebarDuplicationBug := isMobile
                           AND userRole = "customer"
                           AND sidebarRendersCustomerLinks = true

  RETURN isFlowPage
      OR isNavbarDimensionBug
      OR isLayoutBug
      OR isSidebarDuplicationBug
END FUNCTION
```

### Examples

- Customer on `/dashboard/checkout` (mobile): bottom navbar is visible — should be hidden
- Customer on `/dashboard/booking/abc-123` (mobile): bottom navbar is visible — should be hidden
- Customer on `/dashboard` (iOS Safari): navbar is clipped by home indicator — missing safe-area padding
- Customer on `/dashboard` (mobile): sidebar shows Home, Events, Bookings, Billing, Settings — already in bottom navbar
- Customer on `/dashboard` (desktop): sidebar correctly shows all 9 `customerLinks` — no bug here

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Non-customer users (organizer, admin, merchant) on mobile must continue to see full sidebar navigation with no bottom navbar
- Customers on desktop must continue to see the full `customerLinks` list in the sidebar and no bottom navbar
- Active nav item highlighting in the bottom navbar must continue to work correctly
- `createPortal` rendering into `document.body` must be preserved to bypass stacking context issues
- Main content area must continue to apply sufficient `paddingBottom` (≥ 100px) to prevent content from being obscured by the navbar

**Scope:**
All inputs that do NOT match the bug condition should be completely unaffected. This includes:
- Non-customer roles on any route
- Customers on desktop
- Customers on main nav pages (navbar visibility and active state logic)
- Any existing click/navigation behavior in the bottom navbar

## Hypothesized Root Cause

1. **Missing route-based hide logic in BottomNavBar**: The component checks `user.role` but has no `pathname`-based check. Flow pages (`/dashboard/booking/:id`, `/dashboard/checkout`, `/dashboard/payment`) are never excluded.

2. **Hardcoded 60px height without safe-area awareness**: The `height: "60px"` style does not add `paddingBottom: "env(safe-area-inset-bottom)"`, so on devices with a home indicator the navbar is partially obscured. The total height should be `70px` to accommodate the padding.

3. **No explicit width enforcement**: The navbar relies on `left: 0` / `right: 0` but does not set `width: "100vw"` and `maxWidth: "100vw"`, which can cause clipping in some mobile browsers with scrollable content.

4. **DashboardLayout uses `100vh` instead of `100dvh`**: On mobile browsers with collapsible toolbars, `100vh` is the maximum viewport height (toolbars hidden), so when toolbars are visible the layout overflows and overlaps the navbar.

5. **AppSidebar always renders `customerLinks` for customers**: The `links` variable resolves to `customerLinks` for all customers regardless of `isMobile`. On mobile, this duplicates the 5 primary items already in the bottom navbar. The `customerSecondaryLinks` array exists but is never used.

## Correctness Properties

Property 1: Bug Condition — Flow Page Navbar Hiding

_For any_ route where the pathname starts with `/dashboard/booking`, `/dashboard/checkout`, or `/dashboard/payment`, the fixed `BottomNavBar` component SHALL return `null` and render nothing, regardless of user role or auth state.

**Validates: Requirements 2.2**

Property 2: Bug Condition — Navbar Dimensions and Safe Area

_For any_ render of the bottom navbar on mobile, the fixed component SHALL apply `height: "70px"`, `paddingBottom: "env(safe-area-inset-bottom)"`, `width: "100vw"`, and `maxWidth: "100vw"` to prevent device chrome overlap and layout clipping.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition — Sidebar Deduplication for Mobile Customers

_For any_ render of `AppSidebar` where `isMobile` is true and `user.role` is `"customer"`, the fixed component SHALL render only `customerSecondaryLinks` (not `customerLinks`), so that primary navigation items are not duplicated alongside the bottom navbar.

**Validates: Requirements 2.6**

Property 4: Preservation — Non-Customer and Desktop Behavior

_For any_ render where `user.role` is not `"customer"`, or where `isMobile` is false, the fixed components SHALL produce exactly the same output as the original components — full sidebar links for non-customers, full `customerLinks` for desktop customers, no bottom navbar for non-customers.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `frontend/src/components/BottomNavBar.tsx`

**Specific Changes**:
1. **Add flow-page hide logic**: After the role check, add a `pathname` check:
   ```ts
   const flowPaths = ["/dashboard/booking", "/dashboard/checkout", "/dashboard/payment"];
   if (flowPaths.some(p => location.pathname.startsWith(p))) return null;
   ```
2. **Update navbar height to 70px** and add `paddingBottom: "env(safe-area-inset-bottom)"` to the nav style
3. **Add `width: "100vw"` and `maxWidth: "100vw"`** to the nav style

---

**File**: `frontend/src/components/DashboardLayout.tsx`

**Specific Changes**:
1. **Replace `minHeight: "100vh"`** with `minHeight: "100dvh"` on both the outer `div` and the inner flex `div`

---

**File**: `frontend/src/components/AppSidebar.tsx`

**Specific Changes**:
1. **Conditionally resolve links for mobile customers**: Change the `links` assignment so that when `isMobile && user?.role === "customer"`, it uses `customerSecondaryLinks` instead of `customerLinks`:
   ```ts
   const links = user?.role === "admin"
     ? adminLinks
     : (user?.role === "organizer" || user?.role === "merchant")
       ? organizerLinks
       : isMobile
         ? customerSecondaryLinks
         : customerLinks;
   ```

## Testing Strategy

### Validation Approach

Two-phase approach: first surface counterexamples on unfixed code to confirm root causes, then verify the fix satisfies all correctness properties and preserves unchanged behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Render `BottomNavBar` with mocked `useLocation` pointing to flow pages and assert it returns `null`. Render with mocked styles and assert dimensions. Render `AppSidebar` with `isMobile=true` and `role="customer"` and assert `customerLinks` items are present (they should be, confirming the duplication bug).

**Test Cases**:
1. **Flow Page Hide Test**: Render `BottomNavBar` with `pathname="/dashboard/checkout"` — assert component returns `null` (will fail on unfixed code)
2. **Booking Route Hide Test**: Render `BottomNavBar` with `pathname="/dashboard/booking/abc"` — assert component returns `null` (will fail on unfixed code)
3. **Safe Area Padding Test**: Render `BottomNavBar` on a main nav page — assert nav style includes `paddingBottom` with `env(safe-area-inset-bottom)` (will fail on unfixed code)
4. **Sidebar Duplication Test**: Render `AppSidebar` with `isMobile=true`, `role="customer"` — assert "Home" and "Events" nav items are NOT rendered (will fail on unfixed code)

**Expected Counterexamples**:
- `BottomNavBar` renders on `/dashboard/checkout` instead of returning `null`
- Nav element has `height: 60px` with no safe-area padding
- `AppSidebar` renders all 9 `customerLinks` items on mobile

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed components produce the expected behavior.

**Pseudocode:**
```
FOR ALL context WHERE isBugCondition(context) DO
  result := fixedComponent(context)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed components produce the same result as the original.

**Pseudocode:**
```
FOR ALL context WHERE NOT isBugCondition(context) DO
  ASSERT originalComponent(context) = fixedComponent(context)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many combinations of role, route, and mobile/desktop context automatically, catching edge cases that manual tests miss.

**Test Cases**:
1. **Non-Customer Sidebar Preservation**: Verify organizer/admin sidebar renders full link list on mobile — unchanged after fix
2. **Desktop Customer Sidebar Preservation**: Verify `customerLinks` (9 items) still render for customers on desktop
3. **Active State Preservation**: Verify active nav item highlighting in bottom navbar is unchanged across main nav pages
4. **Portal Preservation**: Verify `createPortal` is still used and navbar renders into `document.body`

### Unit Tests

- Test `BottomNavBar` returns `null` for each flow page path prefix
- Test `BottomNavBar` renders for each main nav page
- Test `BottomNavBar` nav element has correct height (70px), paddingBottom, width, and maxWidth
- Test `AppSidebar` renders `customerSecondaryLinks` (not `customerLinks`) when `isMobile=true` and `role="customer"`
- Test `AppSidebar` renders `customerLinks` when `isMobile=false` and `role="customer"`
- Test `AppSidebar` renders `organizerLinks` / `adminLinks` unchanged for non-customer roles

### Property-Based Tests

- Generate random flow-page pathnames (any string starting with `/dashboard/booking`, `/dashboard/checkout`, `/dashboard/payment`) and verify `BottomNavBar` always returns `null`
- Generate random non-flow pathnames for customers and verify `BottomNavBar` always renders with correct style properties
- Generate random `{ isMobile, role }` combinations and verify `AppSidebar` link selection matches the expected conditional logic

### Integration Tests

- Full navigation flow: customer on mobile navigates from `/dashboard` → `/dashboard/booking/123` → verify navbar disappears, then back → verify navbar reappears
- Desktop customer: verify sidebar shows all 9 `customerLinks` and no bottom navbar renders
- Non-customer on mobile: verify sidebar shows full role-specific links and no bottom navbar renders
- iOS safe area: verify navbar does not overlap device home indicator (manual/visual test)
