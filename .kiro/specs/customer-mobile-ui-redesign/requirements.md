# Requirements Document

## Introduction

This feature redesigns the Customer Mobile UI to match a production-grade app experience (BookMyShow / Swiggy level). The redesign targets the React/TypeScript frontend, focusing on the customer-facing dashboard, bottom navigation bar, event cards, quick services section, and all inner/detail pages. The goal is a compact, professional, mobile-first layout with consistent navigation patterns, proper icon sizing, and a clean visual hierarchy.

## Glossary

- **BottomNavBar**: The fixed bottom navigation component (`BottomNavBar.tsx`) visible only to customers on main pages.
- **Main Pages**: The four primary customer pages — Home (`/dashboard`), Events (`/dashboard/browse-events`), Bookings (`/dashboard/my-bookings`), Settings (`/dashboard/profile-settings`).
- **Inner Pages**: All customer pages that are not Main Pages — e.g., Billing Details, Booking Details, Event Details, Saved Events, Calendar, Notifications, Gallery.
- **DashboardLayout**: The layout wrapper (`DashboardLayout.tsx`) that renders the sidebar, navbar, and `<Outlet />`.
- **EventCard**: The reusable card component (`EventCard.tsx`) used to display event information.
- **QuickServices**: The horizontal scrollable section on the Home screen showing category and service-type shortcuts.
- **CustomerDashboard**: The home page component (`CustomerDashboard.tsx`) rendered at `/dashboard` for customers.
- **BackButton**: A top-left navigation control rendered on Inner Pages to return to the previous screen.

---

## Requirements

### Requirement 1: Bottom Navigation Bar — Icon Sizing and Alignment

**User Story:** As a customer, I want the bottom navigation bar icons to be fully visible and properly centered, so that I can clearly identify and tap each navigation item.

#### Acceptance Criteria

1. THE BottomNavBar SHALL render each icon at exactly 22px (width and height).
2. THE BottomNavBar SHALL render with a fixed height of 60px (excluding safe-area inset).
3. THE BottomNavBar SHALL use `flex items-center justify-center` for each nav item container so icons are never clipped.
4. THE BottomNavBar SHALL apply consistent horizontal padding so no icon is cut off at screen edges.
5. WHEN the BottomNavBar is rendered, THE BottomNavBar SHALL display all five nav items fully within the visible viewport width.

---

### Requirement 2: Bottom Navigation Bar — Visibility Rules

**User Story:** As a customer, I want the bottom navigation bar to appear only on main pages, so that inner pages have a clean, focused layout without redundant navigation.

#### Acceptance Criteria

1. WHEN the current route is `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, or `/dashboard/profile-settings`, THE BottomNavBar SHALL be visible.
2. WHEN the current route is any other customer route (Inner Page), THE BottomNavBar SHALL be hidden.
3. THE BottomNavBar SHALL evaluate route visibility using an explicit allowlist of Main Page paths.
4. IF the user navigates to an Inner Page, THEN THE BottomNavBar SHALL not render in the DOM (not merely hidden via CSS).

---

### Requirement 3: Back Navigation on Inner Pages

**User Story:** As a customer, I want a back button on inner pages, so that I can easily return to the previous screen without relying on the browser's back control.

#### Acceptance Criteria

1. WHEN the current route is an Inner Page, THE DashboardLayout SHALL render a BackButton in the top-left area of the page header.
2. THE BackButton SHALL navigate to the previous route in history using `navigate(-1)`.
3. THE BackButton SHALL be positioned consistently at the top-left of the content area across all Inner Pages.
4. THE BackButton SHALL display a left-arrow icon (ChevronLeft or ArrowLeft from lucide-react) with a visible label "Back".
5. WHEN the BottomNavBar is hidden (Inner Page), THE DashboardLayout SHALL render the BackButton.
6. WHEN the BottomNavBar is visible (Main Page), THE DashboardLayout SHALL NOT render the BackButton.

---

### Requirement 4: Quick Services Section — Visibility and Layout

**User Story:** As a customer, I want to see a Quick Services section on the home screen, so that I can quickly navigate to event categories and service types.

#### Acceptance Criteria

1. THE CustomerDashboard SHALL render the Quick Services section as a horizontally scrollable row of cards.
2. THE Quick Services section SHALL display at least 4 items (combining categories and service types from the API).
3. WHEN more than 4 items are available, THE Quick Services section SHALL allow horizontal scrolling to reveal additional items.
4. EACH Quick Services card SHALL display an icon/emoji and a label text of no more than 12 characters (truncated with ellipsis if longer).
5. THE Quick Services section SHALL be visible on initial page load without requiring any user interaction.
6. EACH Quick Services card SHALL navigate to the appropriate browse-events URL when tapped.

---

### Requirement 5: Home Screen Layout and Hierarchy

**User Story:** As a customer, I want the home screen to follow a compact, production-app layout, so that I can quickly find relevant content without excessive scrolling.

#### Acceptance Criteria

1. THE CustomerDashboard SHALL render sections in this order: Search Bar → Quick Services → Latest Bookings (if any) → Banner/Highlights → Featured Events → Popular Vendors → Trending Gallery → All Events.
2. THE CustomerDashboard SHALL use font sizes no larger than `text-base` (16px) for section headings on mobile.
3. THE CustomerDashboard SHALL use `text-sm` (14px) or smaller for body text and card metadata.
4. THE CustomerDashboard SHALL render the Featured Events grid with 2 columns on mobile (`grid-cols-2`) and 4 columns on desktop (`lg:grid-cols-4`).
5. THE CustomerDashboard SHALL render the Latest Bookings section only when the customer has at least one booking.
6. WHEN no bookings exist, THE CustomerDashboard SHALL skip the Latest Bookings section without leaving empty space.

---

### Requirement 6: Event Cards — Dual Action Buttons

**User Story:** As a customer, I want both "Book Now" and "View Details" buttons on every event card, so that I can choose to either book immediately or learn more before committing.

#### Acceptance Criteria

1. WHEN `showActions` is `"customer"` and the event status is neither `"completed"` nor `"cancelled"`, THE EventCard SHALL render both a "View Details" button and a "Book Now" button.
2. THE "View Details" button and "Book Now" button SHALL be displayed side-by-side in a single row within the card footer.
3. THE "Book Now" button SHALL occupy the majority of the row width (`flex-1`) and the "View Details" button SHALL have a fixed compact width.
4. WHEN the event `isSoldOut` is true, THE EventCard SHALL render the "Book Now" button as disabled with label "Sold Out".
5. THE "View Details" button SHALL always remain enabled regardless of sold-out status.
6. THE EventCard action row SHALL maintain proper alignment on screens as narrow as 320px.

---

### Requirement 7: Typography and Spacing

**User Story:** As a customer, I want clean, compact typography throughout the app, so that the UI feels professional and easy to read on a small screen.

#### Acceptance Criteria

1. THE CustomerDashboard SHALL NOT use font sizes larger than `text-xl` (20px) for any section heading on mobile viewports.
2. THE EventCard SHALL use `text-sm` (14px) for the event title and `text-[11px]` for metadata (date, location).
3. THE BottomNavBar label text SHALL use `font-size: 10px` and `font-weight: 500`.
4. THE CustomerDashboard SHALL apply consistent horizontal padding of `px-4` or less on mobile to prevent content overflow.
5. THE CustomerDashboard SHALL use `gap-3` or `gap-4` between grid items on mobile (not `gap-6`).

---

### Requirement 8: Mobile-First Responsiveness

**User Story:** As a customer, I want the UI to be optimized for mobile screens, so that I have a comfortable experience on my phone without horizontal scrolling or stretched elements.

#### Acceptance Criteria

1. THE CustomerDashboard SHALL use `grid-cols-2` as the default (mobile) column count for event and service grids.
2. THE DashboardLayout main content area SHALL include bottom padding equal to the BottomNavBar height plus safe-area inset to prevent content being obscured.
3. WHEN the BottomNavBar is hidden (Inner Page), THE DashboardLayout SHALL reduce the bottom padding to a standard value (e.g., `pb-4`).
4. THE BottomNavBar SHALL use `block md:hidden` to remain hidden on desktop viewports.
5. THE CustomerDashboard SHALL NOT render any element with a fixed width that exceeds the viewport width on a 375px screen.

---

### Requirement 9: Navigation Transitions

**User Story:** As a customer, I want smooth navigation transitions between pages, so that the app feels fluid and responsive.

#### Acceptance Criteria

1. WHEN navigating between Main Pages via the BottomNavBar, THE application SHALL transition without a full page reload.
2. WHEN navigating to an Inner Page, THE application SHALL render the BackButton before the page content is visible.
3. THE BottomNavBar active state SHALL update immediately upon route change without delay.
