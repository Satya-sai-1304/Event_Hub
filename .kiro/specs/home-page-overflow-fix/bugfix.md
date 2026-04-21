# Bugfix Requirements Document

## Introduction

Home page (CustomerDashboard) lo sections — featured events cards, gallery, contact, category cards, vendor cards — mobile lo half cut avutunnai, overflow avutunnai, BottomNavBar content ni cover chestundi. Root cause: `DashboardLayout` main container lo `max-w-[1600px] mx-auto` wrapper content ni shrink chestundi, `padding: 12px` mobile lo compress chestundi, `paddingBottom` BottomNavBar height ki insufficient ga undi, gallery/events sections lo proper grid/flex layout ledu, individual cards ki `w-full` ledu. Ee bug mobile viewports (< 768px) lo visible avutundi.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a customer opens the home page (`/dashboard`) on a mobile device THEN the system renders sections (events, gallery, vendors, categories) inside a `max-w-[1600px] mx-auto` wrapper that shrinks content width, causing cards to appear cut off or partially visible

1.2 WHEN the home page renders on mobile THEN the system applies `padding: "12px"` uniformly to the main container, compressing content horizontally and causing overflow on small screens

1.3 WHEN the home page is the active page (`isMainPage === true`) THEN the system sets `paddingBottom: "80px"` on the main container, which is insufficient to clear the 70px BottomNavBar plus safe-area insets, causing the last section to be hidden behind the nav bar

1.4 WHEN the featured events section renders on mobile THEN the system renders event cards in a `grid grid-cols-2 gap-2` without `w-full` on individual cards, causing cards to overflow or get clipped within their grid cells

1.5 WHEN the gallery section renders on mobile THEN the system renders gallery items in a vertical `flex flex-col gap-3` layout, causing images to stack and overflow the viewport height

1.6 WHEN the contact/vendor section renders on mobile THEN the system renders vendor cards without a constrained full-width wrapper, causing cards to overflow the container horizontally

### Expected Behavior (Correct)

2.1 WHEN a customer opens the home page on a mobile device THEN the system SHALL render all sections inside a `w-full px-3 sm:px-4 md:px-6` wrapper (replacing `max-w-[1600px] mx-auto`) so content uses the full available width without shrinking

2.2 WHEN the home page renders on mobile THEN the system SHALL apply `padding: "8px"` to the main container so horizontal space is not unnecessarily compressed

2.3 WHEN the home page is the active page (`isMainPage === true`) THEN the system SHALL set `paddingBottom: "90px"` on the main container so all content is fully visible above the BottomNavBar

2.4 WHEN the featured events section renders on mobile THEN the system SHALL render event cards with `className="w-full"` inside a `grid grid-cols-1 sm:grid-cols-2 gap-3` layout so each card occupies full cell width without clipping

2.5 WHEN the gallery section renders on mobile THEN the system SHALL render gallery items in a `flex gap-3 overflow-x-auto pb-2` horizontal scroll layout with each image container having `min-w-[160px] h-[120px]`, matching an Instagram-style horizontal scroll

2.6 WHEN the contact/vendor section renders on mobile THEN the system SHALL wrap vendor cards in `<div className="w-full max-w-md mx-auto">` with inner `<div className="p-4 rounded-xl">` so cards are properly constrained and do not overflow

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the home page is viewed on desktop (≥ 768px) THEN the system SHALL CONTINUE TO render the multi-column grid layout for events, vendors, and categories as before

3.2 WHEN a non-main page (e.g., `/dashboard/my-bookings`, `/dashboard/browse-events`) is active THEN the system SHALL CONTINUE TO apply `paddingBottom: "16px"` to the main container (no BottomNavBar padding needed)

3.3 WHEN the BottomNavBar renders THEN the system SHALL CONTINUE TO display it fixed at the bottom with `height: 70px`, `zIndex: 9999`, and only for customer role on main pages

3.4 WHEN the back button is shown on sub-pages THEN the system SHALL CONTINUE TO render the `BackButton` component above the page content

3.5 WHEN the sidebar renders on desktop THEN the system SHALL CONTINUE TO show `AppSidebar` in the `hidden sm:flex` container without any layout changes

3.6 WHEN event cards render in the organizer or admin dashboard THEN the system SHALL CONTINUE TO display with existing action buttons (Edit, Delete, Notify, Cancel) and layout unchanged

3.7 WHEN the gallery lightbox modal is opened THEN the system SHALL CONTINUE TO display the full-screen image viewer with navigation, like, download, and share buttons

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type { viewport: string, page: string, section: string }
  OUTPUT: boolean

  RETURN X.viewport = "mobile"
    AND X.page = "/dashboard"
    AND (
      X.section IN ["main-container", "events-grid", "gallery", "vendor-cards", "contact-section"]
    )
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← renderHomePage'(X)
  ASSERT result.sections_fully_visible = true
    AND result.content_overflow = false
    AND result.bottomnav_overlap = false
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderHomePage(X) = renderHomePage'(X)
END FOR
```
