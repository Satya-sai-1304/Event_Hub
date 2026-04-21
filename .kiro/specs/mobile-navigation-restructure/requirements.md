# Requirements Document

## Introduction

This feature restructures the mobile navigation for the EventHub customer-facing dashboard. The goal is to deliver a native-app-like mobile experience by promoting the Bottom Navigation Bar to the primary navigation mechanism and demoting the Sidebar (Drawer) to a secondary utility panel for profile, help, and logout actions only. Desktop behavior remains unchanged.

## Glossary

- **BottomNavBar**: The fixed bottom navigation component (`BottomNavBar.tsx`) rendered on mobile screens for customer users.
- **AppSidebar**: The slide-in drawer component (`AppSidebar.tsx`) used for navigation and utility links.
- **DashboardLayout**: The root layout component (`DashboardLayout.tsx`) that composes the Sidebar, Navbar, and BottomNavBar.
- **Navbar**: The top navigation bar component (`Navbar.tsx`) rendered in dashboard variant, containing the hamburger/sidebar trigger.
- **Primary Navigation**: Navigation items that represent the main sections of the app: Dashboard, Browse Events, Bookings, Billings, Settings.
- **Secondary Navigation**: Utility items not part of the main flow: Profile, Help/Support, Logout.
- **Mobile**: Viewport widths below the `sm` breakpoint (< 640px), as defined by the existing `sm:hidden` / `hidden sm:flex` Tailwind usage.
- **Hamburger Button**: The `SidebarTrigger` button rendered in the Navbar that opens the AppSidebar.
- **Customer**: A user with `role === "customer"` as returned by `AuthContext`.

---

## Requirements

### Requirement 1: Bottom Navigation as Primary Navigation

**User Story:** As a customer on mobile, I want a persistent bottom navigation bar with the five main sections, so that I can switch between primary areas of the app with one tap, just like a native mobile app.

#### Acceptance Criteria

1. THE BottomNavBar SHALL display exactly five navigation items in this order: Dashboard (Home icon), Browse Events (CalendarSearch icon), Bookings (Ticket icon), Billings (CreditCard icon), Settings (Settings icon).
2. THE BottomNavBar SHALL be visible on all customer dashboard pages on mobile viewports.
3. WHEN a customer taps a BottomNavBar item, THE BottomNavBar SHALL navigate to the corresponding route immediately.
4. WHEN a customer is on a route matching a BottomNavBar item, THE BottomNavBar SHALL highlight that item using the primary color to indicate the active state.
5. THE BottomNavBar SHALL only be rendered for users with `role === "customer"`.
6. THE BottomNavBar SHALL remain hidden on viewports at or above the `sm` breakpoint (≥ 640px).

---

### Requirement 2: Sidebar Restricted to Secondary Navigation Only

**User Story:** As a customer on mobile, I want the sidebar to contain only utility links (Profile, Help/Support, Logout), so that the sidebar is not used for main navigation and does not duplicate the bottom bar.

#### Acceptance Criteria

1. WHEN the AppSidebar is rendered for a customer on mobile, THE AppSidebar SHALL display only the following items: Profile Settings, Help/Support, and Logout.
2. THE AppSidebar SHALL NOT display primary navigation links (Dashboard, Browse Events, My Bookings, Billing & Payments, Settings/Profile Settings as a nav item) in the customer mobile sidebar.
3. THE AppSidebar SHALL display a clearly labeled section header (e.g., "Account") to group the secondary items.
4. WHERE the user role is `organizer` or `admin`, THE AppSidebar SHALL continue to display the full navigation link set unchanged (desktop and mobile behavior for non-customer roles is unaffected).

---

### Requirement 3: Sidebar Opens on Hamburger Click

**User Story:** As a customer on mobile, I want to open the sidebar by tapping the hamburger icon in the top navbar, so that I can access secondary options when needed.

#### Acceptance Criteria

1. WHEN a customer taps the Hamburger Button in the Navbar, THE AppSidebar SHALL open as a drawer overlay on mobile.
2. THE Navbar SHALL display the Hamburger Button on mobile viewports for customer users.
3. WHILE the AppSidebar is open, THE AppSidebar SHALL render as an overlay above the page content without pushing the layout.

---

### Requirement 4: Sidebar Closes Immediately After Item Selection

**User Story:** As a customer on mobile, I want the sidebar to close automatically when I tap any item inside it, so that I am taken directly to the destination without an extra dismiss step.

#### Acceptance Criteria

1. WHEN a customer taps any item in the AppSidebar on mobile, THE AppSidebar SHALL close immediately before or during the navigation transition.
2. WHEN a customer taps the Logout button in the AppSidebar, THE AppSidebar SHALL close and THE System SHALL execute the logout action.
3. THE AppSidebar SHALL also close when a customer taps outside the drawer overlay area.

---

### Requirement 5: No Sidebar Usage for Primary Navigation Pages

**User Story:** As a customer on mobile, I want the sidebar to be completely free of primary navigation links, so that there is a single, consistent way to navigate the main sections of the app.

#### Acceptance Criteria

1. THE AppSidebar SHALL NOT contain links to `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, or `/dashboard/profile-settings` when rendered for a customer on mobile.
2. WHEN a customer opens the AppSidebar on mobile, THE AppSidebar SHALL present only secondary/utility actions.
3. THE DashboardLayout SHALL ensure the BottomNavBar and the AppSidebar do not present duplicate navigation destinations for customer users on mobile.

---

### Requirement 6: Smooth Mobile Experience

**User Story:** As a customer on mobile, I want navigation transitions and interactions to feel smooth and native, so that the app feels polished and responsive.

#### Acceptance Criteria

1. WHEN a customer taps a BottomNavBar item, THE BottomNavBar SHALL provide immediate visual feedback by updating the active state within 100ms.
2. WHEN the AppSidebar opens or closes, THE AppSidebar SHALL animate with a slide transition of no more than 300ms duration.
3. THE DashboardLayout SHALL add bottom padding to the main content area on mobile equal to the height of the BottomNavBar (56px) so that page content is not obscured by the bar.
4. THE BottomNavBar SHALL use `position: fixed` at the bottom of the viewport so that it remains visible during page scroll.
5. WHEN a customer navigates between primary sections, THE System SHALL not trigger a full page reload; navigation SHALL use client-side routing.
