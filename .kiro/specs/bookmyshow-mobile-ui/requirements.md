# Requirements Document

## Introduction

This feature redesigns the Customer App's mobile UI to match a BookMyShow-style layout. The goal is a clean, compact, real-app feel with no oversized elements, a structured home screen, and consistent spacing. The redesign targets the `CustomerDashboard` and its child components within the React/TypeScript frontend. All changes are mobile-first (applied on screens narrower than the `md` breakpoint) and must not break the existing desktop layout.

## Glossary

- **Customer_Dashboard**: The `CustomerDashboard.tsx` page rendered for authenticated customers at `/dashboard`.
- **Top_Navbar**: The fixed top navigation bar rendered by `Navbar.tsx` in dashboard variant, height 56 px.
- **Search_Bar**: The combined location-picker + keyword search input rendered inside `CustomerDashboard`.
- **Banner_Carousel**: The auto-scrolling image carousel powered by Swiper that displays active admin banners.
- **Quick_Services**: The horizontally scrollable row of category/service-type shortcut buttons.
- **Featured_Events_Section**: The grid section displaying up to 4 featured events, 2 cards per row.
- **Recommended_Events_Section**: The grid section rendered by `RecommendedEvents.tsx`, 2 cards per row.
- **Event_Card**: The `EventCard.tsx` component used inside Featured and Recommended sections.
- **Gallery_Grid**: The photo gallery rendered by `EventGallery.tsx`, 3 images per row.
- **Bottom_Navbar**: The `BottomNavBar.tsx` fixed bottom navigation bar, height 70 px, visible only on main pages for customers.
- **Explore_Events_Section**: Any section on the dashboard that duplicates a full browse/explore events listing (to be removed).
- **Main_Pages**: The routes defined in `MAIN_PAGES` constant: `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/profile-settings`.

---

## Requirements

### Requirement 1: Top Navbar Layout

**User Story:** As a customer, I want a clean, compact top navbar so that I can quickly access my profile and notifications without wasting screen space.

#### Acceptance Criteria

1. THE Top_Navbar SHALL have a fixed height of 56 px on mobile screens.
2. THE Top_Navbar SHALL display a location indicator or profile shortcut on the left side.
3. THE Top_Navbar SHALL display a notification bell icon and a profile avatar on the right side.
4. THE Top_Navbar SHALL use a white background with a bottom border of 1 px in a light gray color.
5. THE Top_Navbar SHALL render text at a font size between 14 px and 16 px.
6. WHILE the user is on a non-dashboard route, THE Top_Navbar SHALL remain hidden or use the public variant.

---

### Requirement 2: Search Bar with Location Picker

**User Story:** As a customer, I want a combined location and search bar so that I can find events near me in a single compact input row.

#### Acceptance Criteria

1. THE Search_Bar SHALL have a height of 40 px, border radius of 10 px, horizontal padding of 12 px, and margin of 8 px on the top/bottom and 12 px on the left/right.
2. THE Search_Bar SHALL display a location pin icon followed by the selected city name (e.g., "Hyderabad") on the left side.
3. THE Search_Bar SHALL display a search icon followed by placeholder text "Search events..." on the right side.
4. WHEN the user taps the location area, THE Search_Bar SHALL open the location picker popover.
5. WHEN the user types in the search field, THE Search_Bar SHALL display autocomplete suggestions within 300 ms of the last keystroke.
6. IF the search field is empty and the user submits, THEN THE Search_Bar SHALL remain on the current page without navigating.

---

### Requirement 3: Banner Carousel

**User Story:** As a customer, I want an auto-scrolling banner carousel so that I can see featured promotions without manual interaction.

#### Acceptance Criteria

1. THE Banner_Carousel SHALL have a height of 140 px on mobile screens.
2. THE Banner_Carousel SHALL have a border radius of 12 px and horizontal margin of 12 px.
3. THE Banner_Carousel SHALL auto-scroll through active banners with a delay of no more than 5000 ms per slide.
4. WHEN no active banners exist, THE Banner_Carousel SHALL not render any visible container.
5. THE Banner_Carousel SHALL display pagination dots that are clickable for manual navigation.

---

### Requirement 4: Quick Services Horizontal Scroll

**User Story:** As a customer, I want a horizontally scrollable row of service category shortcuts so that I can jump to a category with one tap.

#### Acceptance Criteria

1. THE Quick_Services SHALL render as a single horizontally scrollable row with no visible scrollbar.
2. EACH Quick_Services item card SHALL have a width of 70 px, height of 70 px, and a gap of 10 px between cards.
3. EACH Quick_Services item SHALL display an icon of 24 px and a label at 12 px font size below the icon.
4. THE Quick_Services SHALL display categories and service types fetched from the API, up to 12 items.
5. WHEN a Quick_Services item is tapped, THE Customer_Dashboard SHALL navigate to the corresponding browse-events URL.

---

### Requirement 5: Featured Events Grid (2 per row)

**User Story:** As a customer, I want to see featured events in a 2-per-row compact grid so that I can browse more events without excessive scrolling.

#### Acceptance Criteria

1. THE Featured_Events_Section SHALL render Event_Card components in a 2-column grid on mobile screens.
2. EACH Event_Card in the Featured_Events_Section SHALL occupy 48% of the row width with a gap of 8 px between cards.
3. EACH Event_Card image SHALL have a height of 120 px and a border radius of 10 px.
4. EACH Event_Card SHALL display the event title at 14 px font size and subtitle/date at 12 px font size.
5. EACH Event_Card SHALL display both a "Book Now" button and a "Details" button in a flex row layout.
6. EACH action button SHALL have a height of 34 px, font size of 12 px, and a gap of 6 px between the two buttons.
7. THE Featured_Events_Section SHALL display a maximum of 4 events on the dashboard.
8. WHEN the user taps "Book Now", THE Customer_Dashboard SHALL navigate to the appropriate booking page for that event type.
9. WHEN the user taps "Details", THE Customer_Dashboard SHALL open the event detail modal for that event.

---

### Requirement 6: Recommended Events Grid (2 per row)

**User Story:** As a customer, I want recommended events displayed in the same compact 2-per-row grid as featured events so that the layout is visually consistent.

#### Acceptance Criteria

1. THE Recommended_Events_Section SHALL render Event_Card components in a 2-column grid on mobile screens.
2. EACH Event_Card in the Recommended_Events_Section SHALL follow the same sizing rules as Requirement 5 (48% width, 120 px image height, 34 px buttons).
3. THE Recommended_Events_Section SHALL display a maximum of 4 recommended events on the dashboard.
4. WHEN no recommended events are available, THE Recommended_Events_Section SHALL not render any visible container.

---

### Requirement 7: Gallery Grid (3 per row)

**User Story:** As a customer, I want to see a compact 3-per-row photo gallery so that I can browse event memories without large stretched images.

#### Acceptance Criteria

1. THE Gallery_Grid SHALL render images in a 3-column grid on mobile screens.
2. EACH gallery image cell SHALL have a height of 90 px, border radius of 8 px, and a gap of 6 px between cells.
3. EACH gallery image SHALL use `object-fit: cover` to prevent stretching or distortion.
4. WHEN a gallery image is tapped, THE Gallery_Grid SHALL open the lightbox modal for that image.
5. THE Gallery_Grid SHALL not render large single-image cards or one-by-one big card layouts on mobile.

---

### Requirement 8: Removal of Explore Events Section

**User Story:** As a customer, I want the redundant "Explore Events" section removed from the dashboard so that the home screen is not cluttered with duplicate content.

#### Acceptance Criteria

1. THE Customer_Dashboard SHALL not render any section titled "Explore Events" or equivalent full browse listing on the home screen.
2. THE Customer_Dashboard SHALL not render large single-column stretched event cards on the home screen.
3. WHEN the user wants to browse all events, THE Customer_Dashboard SHALL provide navigation via the Quick_Services row or the Bottom_Navbar "Events" tab.

---

### Requirement 9: Back Button

**User Story:** As a customer, I want exactly one back button on detail/sub-pages so that navigation is unambiguous.

#### Acceptance Criteria

1. WHEN a sub-page or modal requires a back action, THE Customer_Dashboard SHALL render exactly one back button.
2. THE back button SHALL be positioned at the top-left of the screen or modal.
3. THE back button icon SHALL be 16 px and the accompanying text SHALL be 14 px font size.
4. THE Customer_Dashboard SHALL not render multiple back buttons on the same screen simultaneously.

---

### Requirement 10: Bottom Navbar

**User Story:** As a customer, I want a persistent bottom navigation bar with 5 tabs so that I can switch between main sections with one tap.

#### Acceptance Criteria

1. THE Bottom_Navbar SHALL display exactly 5 tabs: Home, Events, Bookings, Billing, Settings.
2. THE Bottom_Navbar SHALL have a fixed height of 70 px.
3. EACH Bottom_Navbar tab icon SHALL be 24 px and the label text SHALL be 11 px font size.
4. THE Bottom_Navbar SHALL always center its tab items horizontally.
5. THE Bottom_Navbar SHALL be visible only on Main_Pages for authenticated customers.
6. WHILE the user is on a non-Main_Page route, THE Bottom_Navbar SHALL not be rendered.
7. THE Bottom_Navbar SHALL highlight the active tab using the primary brand color.

---

### Requirement 11: Spacing System

**User Story:** As a customer, I want consistent spacing throughout the dashboard so that the UI feels clean and uncluttered.

#### Acceptance Criteria

1. THE Customer_Dashboard SHALL apply a section gap of 16 px between top-level sections.
2. THE Customer_Dashboard SHALL apply a card gap of 8 px between cards within a grid.
3. THE Customer_Dashboard SHALL apply a horizontal padding of 12 px to all full-width sections.
4. THE Customer_Dashboard SHALL not render any element that causes horizontal overflow or requires horizontal scrolling at the page level.
5. IF a section has no data to display, THEN THE Customer_Dashboard SHALL not render that section's container or heading, preserving spacing for adjacent sections.
