# Design Document

## Mobile Navigation Restructure

---

## Overview

This design restructures the customer-facing mobile navigation in the EventHub dashboard. The current state has `AppSidebar` serving as the primary navigation for all roles including customers on mobile. The target state promotes `BottomNavBar` to the sole primary navigation mechanism for customers on mobile, and restricts `AppSidebar` to secondary/utility actions only (Profile Settings, Help/Support, Logout).

Desktop behavior and non-customer role behavior (organizer, admin) are entirely unaffected.

### Key Design Decisions

- **No new components**: All changes are confined to existing files — `AppSidebar.tsx`, `DashboardLayout.tsx`, and `BottomNavBar.tsx`. No new abstractions are needed.
- **Role-based branching in AppSidebar**: The sidebar already branches on `user.role` to pick a link set. We extend this by giving customers a dedicated mobile-only secondary link set.
- **`useSidebar` hook for auto-close**: The Shadcn sidebar exposes `setOpenMobile` via `useSidebar`. Each sidebar item calls this on click to close the drawer immediately.
- **`collapsible="offcanvas"`**: Already set on `<Sidebar>`. This ensures the sidebar overlays content rather than pushing it, satisfying the overlay requirement.

---

## Architecture

The navigation system is composed of three layers:

```
DashboardLayout
├── AppSidebar          (secondary nav for customers; full nav for organizer/admin)
├── Navbar              (top bar with SidebarTrigger hamburger + utility icons)
├── <Outlet />          (page content, padded bottom on mobile)
└── BottomNavBar        (primary nav for customers on mobile only)
```

On mobile for customers:
- `BottomNavBar` is always visible (fixed bottom)
- `AppSidebar` is hidden until hamburger is tapped; shows only Account section
- `Navbar` shows hamburger + utility icons (notifications, profile, theme)

On desktop (≥ 640px) for customers:
- `BottomNavBar` is hidden (`sm:hidden`)
- `AppSidebar` is visible with the full customer link set (unchanged from current)

For organizer/admin on any viewport:
- `BottomNavBar` returns null (role guard)
- `AppSidebar` shows full role-specific link set (unchanged)

---

## Components and Interfaces

### BottomNavBar.tsx

No structural changes needed. The component already:
- Renders only for `role === "customer"`
- Is hidden on `sm:` and above via `sm:hidden`
- Uses `NavLink` for client-side routing with active state detection
- Is `position: fixed` at `bottom-0`

The `navItems` array already matches the required five items in the correct order.

### AppSidebar.tsx

This is the primary change surface. The customer link set must be replaced with a secondary-only set when on mobile.

**New customer mobile link set** (replaces `customerLinks` for mobile):
```ts
const customerSecondaryLinks = [
  { title: "Profile Settings", url: "/dashboard/profile-settings", icon: UserCog },
  { title: "Help & Support",   url: "/dashboard/help",             icon: HelpCircle },
];
```

Logout remains in `SidebarFooter` as a button (already present).

**Auto-close on item click**: Each `SidebarMenuButton` wraps a `RouterNavLink`. We add an `onClick` handler that calls `setOpenMobile(false)` from `useSidebar()`.

**Section header**: A `SidebarGroupLabel` with text "Account" wraps the secondary items for customers.

**Role branching logic**:
```ts
const isMobileCustomer = user?.role === "customer";
const links = user?.role === "admin"
  ? adminLinks
  : (user?.role === "organizer" || user?.role === "merchant")
    ? organizerLinks
    : isMobileCustomer
      ? customerSecondaryLinks   // mobile customer: secondary only
      : customerLinks;           // desktop customer: full set (handled by DashboardLayout hiding sidebar on mobile)
```

Since `DashboardLayout` already hides the sidebar on mobile via `hidden sm:flex`, the sidebar only renders on desktop for customers — meaning `customerLinks` (full set) is shown on desktop and `customerSecondaryLinks` is shown on mobile. However, because the sidebar can still be opened via the hamburger on mobile (the `SidebarProvider` state is shared), we need the sidebar content itself to be aware of viewport. We use the existing `useIsMobile()` hook (from `hooks/use-mobile.tsx`) to branch:

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

### DashboardLayout.tsx

The `AppSidebar` wrapper `div` uses `hidden sm:flex` — this hides the sidebar from the static layout on mobile. The sidebar can still be opened as an overlay via `SidebarTrigger` because `SidebarProvider` manages open state independently of the wrapper div visibility.

The `main` element already has `pb-16 sm:pb-4` which provides 64px bottom padding on mobile (slightly more than the 56px BottomNavBar height). This satisfies requirement 6.3 and needs no change.

### Navbar.tsx (dashboard variant)

The `SidebarTrigger` is already rendered in the dashboard navbar. No changes needed. The hamburger is visible on all viewport sizes in the dashboard variant, which is correct — on mobile it opens the secondary sidebar overlay; on desktop it collapses/expands the sidebar.

---

## Data Models

No new data models. The navigation structure is defined as static arrays in `AppSidebar.tsx` and `BottomNavBar.tsx`.

**BottomNavBar items** (unchanged, already correct):
```ts
[
  { label: "Home",     icon: Home,          to: "/dashboard" },
  { label: "Events",   icon: CalendarSearch, to: "/dashboard/browse-events" },
  { label: "Bookings", icon: Ticket,         to: "/dashboard/my-bookings" },
  { label: "Billings", icon: CreditCard,     to: "/dashboard/billing-payments" },
  { label: "Settings", icon: Settings,       to: "/dashboard/profile-settings" },
]
```

**Customer secondary sidebar items** (new):
```ts
[
  { title: "Profile Settings", url: "/dashboard/profile-settings", icon: UserCog },
  { title: "Help & Support",   url: "/dashboard/help",             icon: HelpCircle },
  // Logout is a button in SidebarFooter, not a link item
]
```

**Route overlap check** — BottomNavBar routes vs customer sidebar routes:
- BottomNavBar: `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, `/dashboard/profile-settings`
- Customer sidebar (mobile): `/dashboard/profile-settings`, `/dashboard/help`
- Overlap: `/dashboard/profile-settings` appears in both

To eliminate duplication, `Profile Settings` should be removed from the sidebar secondary links since Settings in BottomNavBar already navigates to `/dashboard/profile-settings`. The sidebar secondary set becomes:

```ts
[
  { title: "Help & Support", url: "/dashboard/help", icon: HelpCircle },
  // Logout button in footer
]
```

This satisfies Requirement 5.3 (no duplicate destinations).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: BottomNavBar renders exactly five items in correct order

*For any* customer user rendered in the BottomNavBar component, the rendered nav items should be exactly five, in the order: Dashboard, Events, Bookings, Billings, Settings — matching the `navItems` array definition.

**Validates: Requirements 1.1**

---

### Property 2: BottomNavBar is role-gated to customers only

*For any* user with a role other than `"customer"` (e.g., `"organizer"`, `"admin"`), the BottomNavBar component should return null and render nothing.

**Validates: Requirements 1.5**

---

### Property 3: BottomNavBar active state reflects current route

*For any* route path that matches one of the five nav item destinations, rendering BottomNavBar with that location should result in exactly that item having the active (primary color) styling, and all other items having the inactive styling.

**Validates: Requirements 1.3, 1.4**

---

### Property 4: Customer mobile sidebar contains only secondary items

*For any* customer user on a mobile viewport, the AppSidebar should render only secondary/utility items (Help & Support, Logout) and must not contain links to any of the five primary navigation routes (`/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, `/dashboard/profile-settings`).

**Validates: Requirements 2.1, 2.2, 5.1, 5.2**

---

### Property 5: Non-customer sidebar link sets are unchanged

*For any* user with role `"organizer"`, `"merchant"`, or `"admin"`, the AppSidebar should render the same full link set as before this change (organizer/merchant links or admin links respectively), unaffected by the mobile navigation restructure.

**Validates: Requirements 2.4**

---

### Property 6: No duplicate navigation destinations between BottomNavBar and customer mobile sidebar

*For any* customer user on mobile, the set of route destinations in BottomNavBar and the set of route destinations in the customer mobile AppSidebar should have an empty intersection — no route appears in both.

**Validates: Requirements 5.3**

---

### Property 7: Sidebar closes on any item tap

*For any* item in the customer mobile AppSidebar, clicking that item should result in the sidebar's open state being set to false (closed), regardless of which item was tapped.

**Validates: Requirements 4.1**

---

## Error Handling

- **Missing `useSidebar` context**: `useSidebar` must be called within a `SidebarProvider`. `DashboardLayout` already wraps everything in `SidebarProvider`, so this is guaranteed. No additional guard needed.
- **`useIsMobile` returning undefined**: The hook returns a boolean derived from `window.matchMedia`. On SSR or in test environments, it may return `false` (desktop). This is acceptable — tests should mock the hook or use jsdom with appropriate viewport settings.
- **`/dashboard/help` route not yet existing**: The Help & Support link points to `/dashboard/help`. If this route is not yet implemented, the link will navigate to a 404/fallback. This is acceptable for this feature scope; the route can be added in a follow-up. Alternatively, the link can open an external URL or a modal.
- **Logout during sidebar close**: The logout handler calls `setOpenMobile(false)` then `logout()`. If `logout()` throws, the sidebar will already be closed. This is the correct order — close first, then act.

---

## Testing Strategy

### Unit Tests

Focus on specific examples and edge cases:

- Render `BottomNavBar` with a customer user → assert 5 items present with correct labels
- Render `BottomNavBar` with an organizer user → assert component returns null
- Render `BottomNavBar` with `location = "/dashboard/my-bookings"` → assert Bookings item has active class
- Render `AppSidebar` with customer + `isMobile = true` → assert primary nav links are absent
- Render `AppSidebar` with customer + `isMobile = true` → assert "Account" section header is present
- Render `AppSidebar` with organizer → assert full organizer link set is present
- Click a sidebar item → assert `setOpenMobile` was called with `false`
- Click logout in sidebar → assert `logout()` was called and sidebar closed

### Property-Based Tests

Use **fast-check** (already compatible with Vitest/Jest in React projects) for property tests. Each test runs a minimum of 100 iterations.

**Property 1 — BottomNavBar item count and order**
```
// Feature: mobile-navigation-restructure, Property 1: BottomNavBar renders exactly five items in correct order
fc.assert(fc.property(fc.constant(customerUser), (user) => {
  const { getAllByRole } = render(<BottomNavBar />, { user });
  const links = getAllByRole('link');
  expect(links).toHaveLength(5);
  expect(links.map(l => l.textContent)).toEqual(['Home', 'Events', 'Bookings', 'Billings', 'Settings']);
}), { numRuns: 100 });
```

**Property 2 — BottomNavBar role gate**
```
// Feature: mobile-navigation-restructure, Property 2: BottomNavBar is role-gated to customers only
fc.assert(fc.property(fc.constantFrom('organizer', 'admin', 'merchant'), (role) => {
  const { container } = render(<BottomNavBar />, { user: { role } });
  expect(container).toBeEmptyDOMElement();
}), { numRuns: 100 });
```

**Property 3 — Active state reflects route**
```
// Feature: mobile-navigation-restructure, Property 3: BottomNavBar active state reflects current route
fc.assert(fc.property(fc.constantFrom(...navItems.map(i => i.to)), (route) => {
  const { getByText } = render(<BottomNavBar />, { location: route });
  const activeItem = getByText(labelForRoute(route)).closest('a');
  expect(activeItem).toHaveClass('text-primary');
}), { numRuns: 100 });
```

**Property 4 — Customer mobile sidebar secondary-only**
```
// Feature: mobile-navigation-restructure, Property 4: Customer mobile sidebar contains only secondary items
fc.assert(fc.property(fc.constant(customerUser), (_user) => {
  const { queryByText } = render(<AppSidebar />, { user: _user, isMobile: true });
  primaryRouteLabels.forEach(label => {
    expect(queryByText(label)).toBeNull();
  });
}), { numRuns: 100 });
```

**Property 5 — Non-customer sidebar unchanged**
```
// Feature: mobile-navigation-restructure, Property 5: Non-customer sidebar link sets are unchanged
fc.assert(fc.property(fc.constantFrom('organizer', 'admin'), (role) => {
  const { getAllByRole } = render(<AppSidebar />, { user: { role } });
  const links = getAllByRole('link');
  expect(links.length).toBeGreaterThan(5);
}), { numRuns: 100 });
```

**Property 6 — No duplicate routes**
```
// Feature: mobile-navigation-restructure, Property 6: No duplicate navigation destinations
fc.assert(fc.property(fc.constant(customerUser), (_user) => {
  const bottomRoutes = navItems.map(i => i.to);
  const sidebarRoutes = customerSecondaryLinks.map(i => i.url);
  const intersection = bottomRoutes.filter(r => sidebarRoutes.includes(r));
  expect(intersection).toHaveLength(0);
}), { numRuns: 100 });
```

**Property 7 — Sidebar closes on item tap**
```
// Feature: mobile-navigation-restructure, Property 7: Sidebar closes on any item tap
fc.assert(fc.property(fc.constantFrom(...customerSecondaryLinks), (item) => {
  const setOpenMobile = jest.fn();
  const { getByText } = render(<AppSidebar />, { user: customerUser, isMobile: true, setOpenMobile });
  fireEvent.click(getByText(item.title));
  expect(setOpenMobile).toHaveBeenCalledWith(false);
}), { numRuns: 100 });
```
