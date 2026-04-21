# Bugfix Requirements Document

## Introduction

The mobile UI currently suffers from multiple layout and UX defects that result in a cluttered, oversized, and inconsistent experience on small screens. These issues span the bottom navigation bar, event cards, dashboard sections, gallery grid, typography, and spacing — collectively preventing the app from achieving a clean, compact, production-level feel comparable to modern apps like BookMyShow or Swiggy. This document captures each defect, the expected correct behavior, and the existing behaviors that must be preserved.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to the Browse Events page on mobile THEN the system renders a duplicate back button inside the page content in addition to the one already provided by DashboardLayout, causing visual redundancy.

1.2 WHEN the bottom navigation bar renders on mobile THEN the system displays it at an insufficient height with icons and labels that may be cut off or misaligned due to missing safe-area padding.

1.3 WHEN event cards are rendered in the customer view THEN the system does not guarantee both a "Book Now" button and a "View Details" button are always visible side-by-side; the layout collapses or omits buttons in certain states.

1.4 WHEN the customer dashboard (Home page) renders THEN the system displays an "Explore Events" section that adds unnecessary visual clutter and length to the page.

1.5 WHEN the EventGallery component renders on mobile THEN the system displays large banner-style images in a single or two-column grid with oversized heights, consuming excessive vertical space.

1.6 WHEN event cards are displayed in a list or grid on mobile THEN the system renders them as full-width stacked cards instead of a compact 2-per-row grid, wasting horizontal space.

1.7 WHEN text content renders across the dashboard and event pages on mobile THEN the system uses oversized font sizes (titles exceeding 20px, subtitles exceeding 16px) that break the compact layout.

1.8 WHEN page content renders on mobile THEN the system stretches content to full viewport width without horizontal padding, causing text and cards to touch screen edges.

1.9 WHEN event images render in cards THEN the system allows images to exceed a reasonable height (e.g., tall banners), distorting the card proportions on mobile.

1.10 WHEN sections and cards are stacked vertically on mobile THEN the system applies inconsistent or excessive spacing between them, making the page feel bloated.

---

### Expected Behavior (Correct)

2.1 WHEN a user navigates to the Browse Events page on mobile THEN the system SHALL render only one back button — the one provided by DashboardLayout at the top of the content area — and the page-internal back button SHALL be removed. The back button SHALL use font-size: 14px, icon-size: 16px, margin-bottom: 8px, and be left-aligned.

2.2 WHEN the bottom navigation bar renders on mobile THEN the system SHALL display it at a height of 70px with icons sized 22px–24px, label font-size of 11px, a 4px gap between icon and label, vertically centered content, and padding-bottom: env(safe-area-inset-bottom) to prevent cut-off on notched devices.

2.3 WHEN event cards are rendered in the customer view for active events THEN the system SHALL always display both a "View Details" button and a "Book Now" button side-by-side using display: flex, gap: 8px, button height: 36px, and font-size: 13px.

2.4 WHEN the customer dashboard renders THEN the system SHALL NOT render the "Explore Events" section; only "Featured Events" and "Recommended Events" sections SHALL appear.

2.5 WHEN the EventGallery component renders on mobile THEN the system SHALL display images in a 3-per-row grid with image height: 80px–100px, border-radius: 8px, object-fit: cover, and gap: 6px between images.

2.6 WHEN event cards are displayed in a browse or featured grid on mobile THEN the system SHALL render 2 cards per row with card width: 48%, gap: 8px, avoiding full-width stacked layout.

2.7 WHEN text content renders across the dashboard and event pages on mobile THEN the system SHALL use title font-size: 16px–18px, subtitle font-size: 13px–14px, and small/meta text font-size: 11px–12px.

2.8 WHEN page content renders on mobile THEN the system SHALL apply padding-left: 12px and padding-right: 12px to all content containers to prevent edge-to-edge stretching.

2.9 WHEN event images render in cards THEN the system SHALL constrain image height to a maximum of 140px using object-fit: cover to maintain consistent card proportions.

2.10 WHEN sections and cards are stacked vertically on mobile THEN the system SHALL apply margin-bottom: 16px between sections and margin-bottom: 10px between cards for consistent, compact spacing.

2.11 WHEN event cards render THEN the system SHALL apply box-shadow: 0 2px 6px rgba(0,0,0,0.08) and an active/tap visual effect to give a polished, production-level feel.

2.12 WHEN event cards render THEN the system SHALL apply card padding: 12px and border-radius: 12px.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the bottom navigation bar renders THEN the system SHALL CONTINUE TO show it only for authenticated customers on the five main pages: Home, Events, Bookings, Billings, and Settings.

3.2 WHEN a user taps "Book Now" on an event card THEN the system SHALL CONTINUE TO navigate to the correct booking flow based on event type (full-service, ticketed, or standard).

3.3 WHEN a user taps "View Details" on an event card THEN the system SHALL CONTINUE TO open the event detail modal and log the activity.

3.4 WHEN the DashboardLayout renders on desktop (md and above) THEN the system SHALL CONTINUE TO show the sidebar and hide the bottom navigation bar.

3.5 WHEN the DashboardLayout renders on a sub-page (not /dashboard root) THEN the system SHALL CONTINUE TO show the single back button provided by DashboardLayout.

3.6 WHEN event cards render for organizer or admin roles THEN the system SHALL CONTINUE TO show the organizer/admin action buttons (Edit, Delete, Notify, Cancel, Remove) unchanged.

3.7 WHEN event cards render for sold-out or cancelled/completed events THEN the system SHALL CONTINUE TO show the appropriate status indicators ("Sold Out", "Event Ended", "Cancelled") instead of action buttons.

3.8 WHEN the Featured Events section renders THEN the system SHALL CONTINUE TO display real event data fetched from the API.

3.9 WHEN the EventGallery lightbox is opened THEN the system SHALL CONTINUE TO support navigation between images, like/unlike, download, and share actions.

3.10 WHEN the search bar on the dashboard is used THEN the system SHALL CONTINUE TO show autocomplete suggestions and navigate to browse results correctly.

---

## Bug Condition Pseudocode

### Bug Condition Functions

```pascal
FUNCTION isBugCondition_DuplicateBackButton(X)
  INPUT: X = { page: string, isMobile: boolean }
  OUTPUT: boolean
  RETURN X.page = "BrowseEventsPage" AND X.isMobile = true
END FUNCTION

FUNCTION isBugCondition_NavbarCutoff(X)
  INPUT: X = { device: string, hasNotch: boolean }
  OUTPUT: boolean
  RETURN X.device = "mobile" AND (navbar.height < 70 OR navbar.paddingBottom ≠ "env(safe-area-inset-bottom)")
END FUNCTION

FUNCTION isBugCondition_MissingCardButtons(X)
  INPUT: X = { eventStatus: string, showActions: string }
  OUTPUT: boolean
  RETURN X.showActions = "customer" AND X.eventStatus NOT IN ["completed", "cancelled"]
    AND NOT (hasBookNowButton AND hasViewDetailsButton)
END FUNCTION

FUNCTION isBugCondition_ExploreEventsSection(X)
  INPUT: X = { page: string }
  OUTPUT: boolean
  RETURN X.page = "CustomerDashboard" AND "ExploreEvents" section is rendered
END FUNCTION

FUNCTION isBugCondition_OversizedGallery(X)
  INPUT: X = { component: string, viewport: string }
  OUTPUT: boolean
  RETURN X.component = "EventGallery" AND X.viewport = "mobile"
    AND (imageHeight > 100 OR columnsPerRow < 3)
END FUNCTION
```

### Fix Checking Properties

```pascal
// Property: Fix Checking — Duplicate Back Button
FOR ALL X WHERE isBugCondition_DuplicateBackButton(X) DO
  result ← render(BrowseEventsPage, X)
  ASSERT count(backButtons, result) = 1
END FOR

// Property: Fix Checking — Navbar Safe Area
FOR ALL X WHERE isBugCondition_NavbarCutoff(X) DO
  result ← render(BottomNavBar, X)
  ASSERT result.height = 70 AND result.paddingBottom = "env(safe-area-inset-bottom)"
END FOR

// Property: Fix Checking — Card Buttons Always Present
FOR ALL X WHERE isBugCondition_MissingCardButtons(X) DO
  result ← render(EventCard, X)
  ASSERT hasElement(result, "Book Now") AND hasElement(result, "View Details")
END FOR
```

### Preservation Checking

```pascal
// Property: Preservation — Non-buggy inputs unchanged
FOR ALL X WHERE NOT isBugCondition_DuplicateBackButton(X) DO
  ASSERT F(X) = F'(X)  // Back button behavior unchanged on other pages
END FOR

FOR ALL X WHERE NOT isBugCondition_MissingCardButtons(X) DO
  ASSERT F(X) = F'(X)  // Organizer/admin/sold-out card behavior unchanged
END FOR
```
