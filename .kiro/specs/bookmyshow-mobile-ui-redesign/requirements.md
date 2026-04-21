# Requirements Document

## Introduction

This feature delivers a BookMyShow-style mobile UI redesign for the event platform's customer-facing frontend. The current mobile experience suffers from buttons being cut in half, cards with no breathing room, inconsistent font sizes, cluttered screens, and a broken navigation pattern where both a sidebar and a bottom nav bar appear simultaneously. The redesign establishes a clean, minimal layout with a fixed bottom navigation bar as the sole navigation mechanism on mobile, a consistent spacing and typography system, properly rendered cards and buttons, and a structured page layout (header → banner → categories → event cards) that mirrors the BookMyShow UX pattern.

The scope covers the `DashboardLayout`, `AppSidebar`, `BottomNavBar`, `EventCard`, and `CustomerDashboard` components, plus global CSS tokens for spacing and typography.

---

## Glossary

- **Mobile Viewport**: Screen width strictly less than 480px.
- **Tablet Viewport**: Screen width between 480px and 768px (inclusive).
- **Desktop Viewport**: Screen width greater than 768px.
- **Bottom_Nav**: The fixed bottom navigation bar rendered exclusively on mobile and tablet viewports for customer-role users.
- **Sidebar**: The collapsible left-side navigation panel (`AppSidebar`) rendered exclusively on desktop viewports.
- **Event_Card**: The `EventCard` React component that displays a single event's image, title, date, location, price, and action buttons.
- **Dashboard_Layout**: The `DashboardLayout` React component that wraps all authenticated dashboard pages and composes the Sidebar, Navbar, main content area, and Bottom_Nav.
- **Customer_Dashboard**: The `CustomerDashboard` React component that renders the home screen for customer-role users.
- **Spacing_Token**: A CSS custom property (e.g., `--space-sm`, `--space-md`, `--space-lg`) that encodes a fixed pixel value used consistently across all components.
- **Typography_Token**: A CSS custom property (e.g., `--font-h1`, `--font-h2`, `--font-body`, `--font-small`) that encodes a fixed font-size and font-weight pair.
- **Container**: The outermost scrollable content wrapper inside Dashboard_Layout's main area.
- **Section_Gap**: The vertical spacing between top-level sections on the Customer_Dashboard.

---

## Requirements

### Requirement 1: Exclusive Mobile Navigation — Bottom Nav Only

**User Story:** As a customer on a mobile device, I want to see only the Bottom_Nav for navigation so that the screen is not cluttered by a sidebar and a bottom bar at the same time.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px AND the authenticated user's role is "customer", THE Dashboard_Layout SHALL render the Bottom_Nav and SHALL NOT render the Sidebar.
2. WHEN the viewport width is 768px or greater, THE Dashboard_Layout SHALL render the Sidebar and SHALL NOT render the Bottom_Nav.
3. THE Bottom_Nav SHALL be fixed to the bottom of the viewport with a height of exactly 60px.
4. THE Bottom_Nav SHALL contain exactly 5 navigation items: Home, Events, Bookings, Billings, and Profile.
5. WHEN a Bottom_Nav item is active, THE Bottom_Nav SHALL visually distinguish that item using the primary brand color.
6. THE Bottom_Nav SHALL account for the device's safe-area-inset-bottom so that content is not obscured by home-indicator bars on iOS devices.

---

### Requirement 2: Full-Width Buttons with Proper Padding

**User Story:** As a customer viewing an event card on mobile, I want action buttons to be fully visible and tappable so that I can book or view event details without buttons being cut off.

#### Acceptance Criteria

1. THE Event_Card SHALL apply `box-sizing: border-box` to all child elements so that padding does not cause overflow.
2. WHEN the Event_Card is rendered inside a single-column grid on a Mobile Viewport, THE Event_Card's action buttons SHALL span the full available width of the card's content area.
3. THE Event_Card's action buttons SHALL have a minimum height of 32px and horizontal padding of at least 12px on each side.
4. IF the Event_Card's container width is less than 200px, THEN THE Event_Card SHALL stack the "Details" and "Book Now" buttons vertically rather than side by side.
5. THE Container SHALL apply `padding: 12px` on all sides so that Event_Card edges are never flush with the screen edge.

---

### Requirement 3: Consistent Typography Scale

**User Story:** As a customer browsing the dashboard, I want text to be consistently sized and weighted so that the visual hierarchy is clear and readable.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL define the following Typography_Tokens as CSS custom properties:
   - `--font-h1`: font-size 18px, font-weight 600
   - `--font-h2`: font-size 16px, font-weight 600
   - `--font-body`: font-size 14px, font-weight 400
   - `--font-small`: font-size 12px, font-weight 400
2. THE Customer_Dashboard SHALL use `--font-h1` for page-level section headings (e.g., "Featured Events", "Popular Vendors").
3. THE Customer_Dashboard SHALL use `--font-h2` for card titles and sub-section headings.
4. THE Customer_Dashboard SHALL use `--font-body` for descriptive body text and metadata.
5. THE Customer_Dashboard SHALL use `--font-small` for badges, timestamps, and secondary labels.
6. THE Event_Card SHALL use `--font-h2` for the event title and `--font-small` for date, location, and price metadata.

---

### Requirement 4: Event Card Design — Spacing, Radius, and Shadow

**User Story:** As a customer browsing events, I want cards to have clear visual boundaries and breathing room so that I can distinguish individual events at a glance.

#### Acceptance Criteria

1. THE Event_Card SHALL apply a border-radius of 12px to its outermost container.
2. THE Event_Card SHALL apply a box-shadow of `0 2px 8px rgba(0,0,0,0.08)` in its default (non-hovered) state.
3. THE Event_Card SHALL apply a box-shadow of `0 4px 16px rgba(0,0,0,0.14)` when hovered or focused.
4. THE Event_Card's `CardContent` area SHALL apply internal padding of 12px on all sides.
5. WHEN two Event_Cards are adjacent in a grid, THE grid SHALL apply a gap of at least 12px between them.

---

### Requirement 5: Responsive Grid Layout for Event Cards

**User Story:** As a customer on any device, I want event cards to be laid out in a grid that fits the screen width so that cards are neither too small nor overflowing.

#### Acceptance Criteria

1. WHEN the viewport width is less than 480px (Mobile Viewport), THE Customer_Dashboard's event grid SHALL render exactly 1 column.
2. WHEN the viewport width is between 480px and 768px (Tablet Viewport), THE Customer_Dashboard's event grid SHALL render exactly 2 columns.
3. WHEN the viewport width is greater than 768px (Desktop Viewport), THE Customer_Dashboard's event grid SHALL render 2 or more columns as determined by available space.
4. THE event grid SHALL use CSS Grid with `grid-template-columns` to enforce the column counts defined above.
5. THE event grid SHALL apply a column gap and row gap of 12px.

---

### Requirement 6: Consistent Spacing System

**User Story:** As a developer maintaining the codebase, I want a defined set of spacing tokens so that all components use consistent margins and padding without ad-hoc pixel values.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL define the following Spacing_Tokens as CSS custom properties:
   - `--space-sm`: 8px
   - `--space-md`: 12px
   - `--space-lg`: 16px
2. THE Customer_Dashboard SHALL use `--space-lg` (16px) as the Section_Gap between top-level sections.
3. THE Customer_Dashboard SHALL use `--space-md` (12px) as the internal padding for cards and list items.
4. THE Customer_Dashboard SHALL use `--space-sm` (8px) as the gap between inline elements (e.g., icon + label pairs).
5. THE Container SHALL apply `padding: var(--space-md)` (12px) on all sides.

---

### Requirement 7: Global Box-Sizing Reset

**User Story:** As a developer, I want `box-sizing: border-box` applied universally so that padding and borders never cause unexpected layout overflow.

#### Acceptance Criteria

1. THE Dashboard_Layout's global stylesheet SHALL include a CSS rule that sets `box-sizing: border-box` on all elements and pseudo-elements (`*, *::before, *::after`).
2. WHEN `box-sizing: border-box` is applied, THE Event_Card SHALL not overflow its grid cell regardless of the padding values applied to its children.
3. WHEN `box-sizing: border-box` is applied, THE Bottom_Nav SHALL maintain its declared height of 60px regardless of padding applied to its child items.

---

### Requirement 8: BookMyShow-Style Page Layout Structure

**User Story:** As a customer opening the dashboard, I want to see a structured layout (search header → banner → categories → event cards) so that I can quickly find what I need without feeling overwhelmed.

#### Acceptance Criteria

1. THE Customer_Dashboard SHALL render sections in the following top-to-bottom order: Search Header, Promotional Banner, Category Icons, Event Cards.
2. THE Customer_Dashboard's Search Header SHALL contain a location selector and a text search input within a single row.
3. THE Customer_Dashboard's Category Icons section SHALL display categories as horizontally scrollable icon-and-label chips.
4. WHEN the Category Icons section overflows horizontally, THE Customer_Dashboard SHALL allow horizontal scrolling without showing a scrollbar.
5. THE Customer_Dashboard SHALL not render more than 4 top-level sections visible above the fold on a Mobile Viewport to prevent content overload.
6. WHILE the Customer_Dashboard is loading event data, THE Customer_Dashboard SHALL display skeleton placeholder cards in place of Event_Cards.
