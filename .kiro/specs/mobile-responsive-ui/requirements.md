# Requirements Document

## Introduction

This feature overhauls the mobile responsiveness of the EventHub event booking web application. The current UI renders as a scaled-down desktop layout on mobile devices, causing oversized event cards, stacked search bars, large typography, and booking forms that require excessive scrolling. The goal is to implement a fully mobile-first responsive design using Tailwind CSS breakpoints, ensuring a clean and usable experience across all screen sizes without altering desktop behavior.

The application is built with React + TypeScript and Tailwind CSS. Key components affected include: `EventCard`, `Navbar`, `HeroSection`, `BrowseEventsPage`, `BookTicketedEventPage`, `BookFullServicePage`, `BookingPage`, `DashboardLayout`, and related dashboard pages.

## Glossary

- **System**: The EventHub React frontend application
- **EventCard**: The card component (`EventCard.tsx`) that displays event information in grid listings
- **Navbar**: The top navigation bar component (`Navbar.tsx`) used across public and dashboard pages
- **HeroSection**: The full-screen landing section (`HeroSection.tsx`) with background slider and search bar
- **BrowseEventsPage**: The events and services discovery page (`BrowseEventsPage.tsx`) with search, filters, and event grid
- **BookingForm**: Any booking page component (`BookTicketedEventPage.tsx`, `BookFullServicePage.tsx`, `BookingPage.tsx`) that collects user details and payment
- **DashboardLayout**: The authenticated dashboard shell (`DashboardLayout.tsx`) wrapping all dashboard pages
- **AppSidebar**: The sidebar navigation component (`AppSidebar.tsx`) used inside the dashboard layout
- **BottomNavBar**: A new fixed bottom navigation bar component (`BottomNavBar.tsx`) visible only on mobile viewports within the dashboard
- **MobileDashboardHome**: A new mobile-optimized dashboard home page component (`MobileDashboardHome.tsx`) rendered when a customer taps "Home" in the BottomNavBar
- **Mobile**: Viewport width below 640px (Tailwind default breakpoint)
- **Tablet**: Viewport width 640px–1023px (Tailwind `sm` and `md` breakpoints)
- **Desktop**: Viewport width 1024px and above (Tailwind `lg` and `xl` breakpoints)
- **Breakpoint**: A Tailwind CSS responsive prefix (`sm:`, `md:`, `lg:`, `xl:`) that applies styles at a minimum viewport width
- **Touch Target**: An interactive element (button, link, input) sized for reliable finger interaction, minimum 44×44px
- **Hamburger Menu**: A collapsed mobile navigation triggered by a menu icon, revealing nav links in a drawer or overlay
- **Active State**: The visual highlight (purple/primary color) applied to the currently selected BottomNavBar item

---

## Requirements

### Requirement 1: Event Card Grid Layout

**User Story:** As a mobile user, I want event cards to display two per row so that I can browse more events without excessive scrolling.

#### Acceptance Criteria

1. THE System SHALL render the event card grid with `grid-cols-2` as the default (mobile-first) column count.
2. WHEN the viewport reaches the `md` breakpoint (768px), THE System SHALL render the event card grid with `grid-cols-2` or `grid-cols-3` columns.
3. WHEN the viewport reaches the `lg` breakpoint (1024px), THE System SHALL render the event card grid with `grid-cols-3` or `grid-cols-4` columns.
4. THE EventCard SHALL use a reduced image height of at most 120px on mobile (e.g., `h-28` or `aspect-[4/3]`), scaling up to the current height at `lg` breakpoint.
5. THE EventCard SHALL apply reduced internal padding of `p-3` on mobile, scaling to `p-5` at `md` breakpoint.

---

### Requirement 2: Event Card Typography and Content

**User Story:** As a mobile user, I want event card text to be appropriately sized so that content is readable without being oversized.

#### Acceptance Criteria

1. THE EventCard SHALL render the event title using `text-sm` font size on mobile and `text-lg` at `md` breakpoint.
2. THE EventCard SHALL render the event description using `text-xs` font size on mobile.
3. THE EventCard SHALL render metadata (date, location, capacity) using `text-[10px]` or `text-xs` on mobile.
4. THE EventCard SHALL hide the event description text on mobile (using `hidden sm:block` or `line-clamp-0 sm:line-clamp-2`) to reduce card height.
5. WHEN the viewport is below the `sm` breakpoint, THE EventCard SHALL display action buttons stacked or reduced to icon-only to fit within the two-column grid.

---

### Requirement 3: Search and Filter Consolidation

**User Story:** As a mobile user, I want a single compact search and filter section so that I can find events without multiple stacked inputs consuming screen space.

#### Acceptance Criteria

1. THE BrowseEventsPage SHALL render all search inputs (keyword search, location search) in a single row using `flex` layout on mobile, with each input taking equal width.
2. WHEN the viewport is below the `sm` breakpoint, THE BrowseEventsPage SHALL collapse category filter chips and advanced filter controls behind a "Filters" toggle button.
3. WHEN the user taps the "Filters" toggle button, THE BrowseEventsPage SHALL expand the filter panel inline or as a bottom sheet.
4. THE BrowseEventsPage SHALL render search input fields with a height of `h-9` or `h-10` on mobile instead of the default `h-12` or taller.
5. THE BrowseEventsPage SHALL reduce the spacing between the search section and the event grid to `gap-3` or `mb-3` on mobile.

---

### Requirement 4: Responsive Typography

**User Story:** As a mobile user, I want headings and body text to be appropriately sized for small screens so that content does not overflow or appear oversized.

#### Acceptance Criteria

1. THE HeroSection SHALL render the main heading using `text-4xl` on mobile, scaling to `text-6xl` at `md` and `text-8xl` at `lg` breakpoint (replacing the current fixed `text-5xl md:text-8xl`).
2. THE HeroSection SHALL render the subtitle using `text-base` on mobile and `text-2xl` at `md` breakpoint.
3. THE System SHALL replace any fixed heading class of `text-3xl` or larger on page-level headings with responsive equivalents (`text-xl sm:text-2xl lg:text-3xl`).
4. THE System SHALL replace any fixed heading class of `text-5xl` or larger on page-level headings with responsive equivalents (`text-2xl sm:text-4xl lg:text-5xl`).
5. THE HeroSection SHALL render the quick stats section using `gap-6` and `text-2xl` font size on mobile, scaling to `gap-16` and `text-3xl` at `md` breakpoint.

---

### Requirement 5: Booking Form Mobile Optimization

**User Story:** As a mobile user, I want booking forms to be compact and easy to complete on a small screen so that I can book events without excessive scrolling.

#### Acceptance Criteria

1. THE BookingForm SHALL render the main layout as a single column (`grid-cols-1`) on mobile, with the order summary card appearing below the event/ticket selection section.
2. WHEN the viewport reaches the `lg` breakpoint, THE BookingForm SHALL render the layout as a two-column grid (`lg:grid-cols-3`) with the summary card in a sticky sidebar.
3. THE BookingForm SHALL render input fields with a height of `h-10` on mobile instead of `h-12` or `h-16`.
4. THE BookingForm SHALL reduce section padding to `p-4` on mobile instead of `p-8`.
5. THE BookingForm SHALL render the event hero image with a height of `h-48` on mobile instead of `h-[400px]`.
6. THE BookingForm SHALL render the page-level heading using `text-xl` on mobile and `text-3xl` at `lg` breakpoint.
7. IF the user is on mobile and the booking has multiple contact fields, THEN THE BookingForm SHALL stack the contact fields vertically (`grid-cols-1`) instead of side by side (`sm:grid-cols-3`).

---

### Requirement 6: Navigation — Hamburger Menu

**User Story:** As a mobile user, I want a hamburger menu so that the navigation is clean and accessible without taking up screen space.

#### Acceptance Criteria

1. WHILE the viewport is below the `lg` breakpoint, THE Navbar SHALL hide the desktop navigation links and display only the logo, action icons, and a hamburger menu icon.
2. WHEN the user taps the hamburger icon, THE Navbar SHALL display the mobile menu overlay with all navigation links.
3. WHEN the user taps a navigation link in the mobile menu, THE Navbar SHALL close the mobile menu and navigate to the selected route.
4. THE Navbar SHALL render the mobile menu with a minimum touch target height of 44px per navigation item.
5. WHILE the mobile menu is open, THE Navbar SHALL display a close (X) icon in place of the hamburger icon.

---

### Requirement 7: Spacing and Layout Reduction on Mobile

**User Story:** As a mobile user, I want reduced padding and margins so that content uses screen space efficiently without excessive whitespace.

#### Acceptance Criteria

1. THE System SHALL apply `px-3 py-4` or `p-3` as the default mobile padding for page-level containers, scaling to `px-6 py-8` or `p-8` at `lg` breakpoint.
2. THE System SHALL replace any fixed `gap-8` or `gap-10` in grid or flex layouts with `gap-3 sm:gap-6 lg:gap-8` responsive equivalents on mobile.
3. THE DashboardLayout SHALL apply `p-3` padding to the main content area on mobile, scaling to `p-4 md:p-8`.
4. THE System SHALL avoid full-width (`w-full`) block-level elements for buttons on mobile unless the button is a primary call-to-action within a form or card.
5. THE System SHALL apply `space-y-4` between major page sections on mobile, scaling to `space-y-8` at `lg` breakpoint.

---

### Requirement 8: Image Optimization for Mobile

**User Story:** As a mobile user, I want images to load efficiently and display correctly so that the page is fast and visually consistent.

#### Acceptance Criteria

1. THE EventCard SHALL apply `loading="lazy"` to all event images to defer off-screen image loading.
2. THE System SHALL constrain event card images to a consistent aspect ratio using Tailwind's `aspect-ratio` utilities (`aspect-[4/3]` or `aspect-video`) instead of fixed pixel heights on mobile.
3. THE BookingForm SHALL render the event hero image with `object-cover` and a mobile-appropriate height (`h-48 sm:h-64 lg:h-[400px]`).
4. THE HeroSection SHALL maintain full-screen height (`h-screen`) on all breakpoints but ensure background images use `bg-cover bg-center` for correct cropping on mobile.

---

### Requirement 9: Dashboard Pages Mobile Layout

**User Story:** As a mobile user accessing the dashboard, I want dashboard pages to be usable on small screens so that I can manage bookings and events from my phone.

#### Acceptance Criteria

1. THE DashboardLayout SHALL collapse the sidebar by default on mobile (already uses `defaultOpen={false}`) and ensure the main content area fills the full width.
2. THE System SHALL render dashboard stat cards and summary grids using `grid-cols-1` on mobile and `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` at larger breakpoints.
3. THE System SHALL render data tables in dashboard pages with horizontal scroll (`overflow-x-auto`) on mobile to prevent layout overflow.
4. WHEN the viewport is below the `sm` breakpoint, THE System SHALL hide non-essential table columns using `hidden sm:table-cell` to reduce horizontal overflow.
5. THE System SHALL render dashboard page headings using `text-lg sm:text-2xl` responsive sizing.

---

### Requirement 10: Bottom Navigation Bar (Mobile Only)

**User Story:** As a mobile user, I want a fixed bottom navigation bar so that I can switch between the main dashboard sections with one thumb tap without needing to open a sidebar.

#### Acceptance Criteria

1. THE System SHALL render the BottomNavBar as a fixed element at the bottom of the viewport inside the DashboardLayout, visible only on mobile (below the `sm` breakpoint, using `sm:hidden`).
2. THE BottomNavBar SHALL be hidden on tablet and desktop viewports (using `hidden sm:flex` or equivalent so it does not appear at `sm` breakpoint and above).
3. THE BottomNavBar SHALL contain exactly five navigation items in this order: Home (Dashboard), Events (Browse Events), Bookings, Billings, Settings.
4. WHEN the user taps a BottomNavBar item, THE System SHALL navigate to the corresponding route without a full page reload.
5. WHEN the current route matches a BottomNavBar item's route, THE BottomNavBar SHALL render that item's icon and label using the primary (purple) color to indicate the active state.
6. WHEN the current route does not match a BottomNavBar item's route, THE BottomNavBar SHALL render that item's icon and label using the muted foreground color.
7. THE BottomNavBar SHALL render each navigation item with a minimum touch target height of 56px to ensure reliable finger interaction.
8. THE BottomNavBar SHALL render each navigation item with both an icon and a text label below the icon.
9. WHILE the BottomNavBar is visible on mobile, THE AppSidebar SHALL be hidden (using `hidden sm:flex` or equivalent on the sidebar wrapper) so that both navigation elements are never simultaneously visible.
10. THE DashboardLayout SHALL add bottom padding (`pb-16` or equivalent) to the main content area on mobile to prevent content from being obscured by the BottomNavBar.

---

### Requirement 11: Mobile Dashboard Home Page

**User Story:** As a mobile customer, I want a mobile-optimized home page when I tap "Home" in the bottom navigation so that I can quickly find upcoming events and browse categories without the desktop dashboard clutter.

#### Acceptance Criteria

1. WHEN a customer user taps the "Home" item in the BottomNavBar, THE System SHALL render the MobileDashboardHome page at the `/dashboard` route on mobile viewports.
2. THE MobileDashboardHome SHALL render a search bar at the top of the page with placeholder text "Search events…" and a height of `h-10`.
3. THE MobileDashboardHome SHALL render an "Upcoming Events" section below the search bar, displaying event cards in a horizontally scrollable row (`flex overflow-x-auto gap-3`).
4. WHEN the user scrolls the Upcoming Events row horizontally, THE System SHALL reveal additional event cards without vertical page scroll.
5. THE MobileDashboardHome SHALL render a "Popular Categories" section below the Upcoming Events section, displaying category items in a 2-column grid or a horizontally scrollable row.
6. THE MobileDashboardHome SHALL apply `px-4 py-4` page-level padding and `space-y-6` between sections.
7. THE MobileDashboardHome SHALL render section headings using `text-base font-semibold` sizing.
8. IF no upcoming events are available, THEN THE MobileDashboardHome SHALL display a "No upcoming events" placeholder message in the Upcoming Events section.

---

### Requirement 12: Browse Events Page — Mobile Search and Grid Fixes

**User Story:** As a mobile user browsing events, I want a single search bar and a full-width two-column grid so that I can see more events and search without redundant inputs consuming screen space.

#### Acceptance Criteria

1. WHEN the viewport is below the `sm` breakpoint, THE BrowseEventsPage SHALL render only the keyword search bar and hide the location search input (using `hidden sm:flex` or equivalent on the location input wrapper).
2. THE BrowseEventsPage SHALL render the event grid with exactly `grid-cols-2` on mobile (below `sm` breakpoint), regardless of any filter or search state.
3. THE BrowseEventsPage SHALL apply a maximum horizontal padding of `px-2` (8px each side) to the event grid container on mobile, ensuring cards use the full available screen width.
4. THE BrowseEventsPage SHALL apply a grid gap of `gap-2` between event cards on mobile.
5. WHEN the viewport reaches the `sm` breakpoint, THE BrowseEventsPage SHALL restore the location search input and may increase grid gap to `sm:gap-4` or larger.

---

### Requirement 13: Mobile Event Card Redesign

**User Story:** As a mobile user, I want event cards to have a compact, visually clear layout with the image on top, overlaid badges, and a full-width "Book Now" button so that I can quickly scan and book events in the two-column grid.

#### Acceptance Criteria

1. THE EventCard SHALL render the event image at the top of the card occupying the full card width, using `aspect-[4/3]` or `aspect-square` on mobile.
2. THE EventCard SHALL render the status badge (UPCOMING / ONGOING / LIVE) as an overlay in the top-left corner of the image using absolute positioning.
3. THE EventCard SHALL render the price tag as an overlay in the bottom-left corner of the image using absolute positioning, with a semi-transparent background.
4. THE EventCard SHALL render the wishlist heart icon button as an overlay in the top-right corner of the image using absolute positioning.
5. THE EventCard SHALL render the event name below the image using `text-sm font-semibold` with a maximum of 2 lines (`line-clamp-2`).
6. THE EventCard SHALL render the event date and location below the event name using `text-[10px] text-muted-foreground`.
7. THE EventCard SHALL render a "Book Now" button below the date/location row that spans the full card width (`w-full`) using the primary (purple) color.
8. WHEN the event status is "completed" or "cancelled", THE EventCard SHALL replace the "Book Now" button with an appropriate disabled state indicator spanning the full card width.
9. WHEN the event is sold out, THE EventCard SHALL render the "Book Now" button in a disabled state with "Sold Out" label spanning the full card width.
10. THE EventCard SHALL hide the Details and Share action buttons on mobile (below `sm` breakpoint) to reduce visual clutter in the two-column grid, showing only the "Book Now" button.
