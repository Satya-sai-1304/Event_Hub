# Home Page Overflow Fix — Bugfix Design

## Overview

On mobile viewports (< 768px), the `CustomerDashboard` home page renders several sections — featured events, gallery, vendor cards, category cards, and the contact section — that are partially cut off or overflow horizontally. Additionally, the fixed `BottomNavBar` (70px tall) overlaps the last section of content because the main container's `paddingBottom` is insufficient.

The fix is a set of targeted CSS/Tailwind class and inline-style changes across five files. No business logic, API calls, or component interfaces change. Desktop layout (≥ 768px) is fully preserved.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a mobile viewport (`< 768px`) rendering the `/dashboard` home page, causing one or more sections to overflow or be obscured by the BottomNavBar.
- **Property (P)**: The desired behavior when the bug condition holds — all sections are fully visible, no horizontal overflow, and content clears the BottomNavBar.
- **Preservation**: Desktop layout, non-main-page padding, BottomNavBar itself, organizer/admin event card layout, and the gallery lightbox modal must remain unchanged.
- **`DashboardLayout`**: The wrapper component in `frontend/src/components/DashboardLayout.tsx` that provides the `<main>` container with padding and the `max-w-[1600px] mx-auto` inner wrapper.
- **`isMainPage`**: Boolean derived from `MAIN_PAGES` in `BottomNavBar.tsx`; `true` when the current route is one of the four main customer pages.
- **`CustomerDashboard`**: The home page component in `frontend/src/pages/dashboard/CustomerDashboard.tsx` that renders all dashboard sections.
- **`EventCard`**: Reusable card component in `frontend/src/components/EventCard.tsx` used in the featured events grid.
- **`EventGallery`**: Gallery component in `frontend/src/components/EventGallery.tsx` that renders event photo thumbnails.
- **`CategoryCards`**: Category grid component in `frontend/src/components/CategoryCards.tsx`.

---

## Bug Details

### Bug Condition

The bug manifests when a customer views the home page (`/dashboard`) on a mobile device. Six independent layout defects combine to produce the overflow and overlap symptoms:

1. `DashboardLayout` applies `padding: "12px"` uniformly, compressing horizontal space on narrow screens.
2. `DashboardLayout` applies `paddingBottom: "80px"` when `isMainPage === true`, which is insufficient to clear the 70px BottomNavBar plus safe-area insets.
3. The `max-w-[1600px] mx-auto` inner wrapper in `DashboardLayout` shrinks content width on mobile instead of using the full available width.
4. The featured events grid in `CustomerDashboard` uses `grid grid-cols-2 gap-2` without `w-full` on individual card wrappers, causing cards to overflow their cells.
5. `EventGallery` renders items in a vertical `flex flex-col gap-3` layout, causing images to stack and overflow the viewport height.
6. Vendor cards in `CustomerDashboard` lack a constrained full-width wrapper, causing horizontal overflow.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type { viewport: "mobile" | "desktop", page: string, section: string }
  OUTPUT: boolean

  RETURN X.viewport = "mobile"
    AND X.page = "/dashboard"
    AND X.section IN [
      "main-container",
      "events-grid",
      "gallery",
      "vendor-cards",
      "contact-section"
    ]
END FUNCTION
```

### Examples

- **Events grid overflow**: On a 375px-wide screen, `grid grid-cols-2 gap-2` renders two ~180px columns. Without `w-full` on the card `<div>`, the card's internal content (image, text, button) can exceed the cell width and clip.
- **BottomNavBar overlap**: The last section on the page (e.g., vendor cards) renders at y-position ~900px. With `paddingBottom: "80px"`, the bottom of the scrollable area ends only 80px below the last element — the 70px nav bar plus safe-area inset (~34px on iOS) means ~14px of content is hidden.
- **Gallery vertical stack**: `flex flex-col gap-3` stacks three gallery cards vertically, each ~200px tall, producing a ~620px tall section that overflows the viewport and requires excessive scrolling.
- **Wrapper shrink**: `max-w-[1600px] mx-auto` on a 375px screen has no effect on max-width but `mx-auto` combined with the 12px padding leaves only 351px of usable width, which is fine in isolation but compounds with other issues.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop (≥ 768px) multi-column grid layout for events, vendors, and categories renders exactly as before.
- Non-main pages (e.g., `/dashboard/my-bookings`) continue to receive `paddingBottom: "16px"` — no BottomNavBar padding applied.
- `BottomNavBar` height (70px), z-index (9999), fixed positioning, and customer-only visibility remain unchanged.
- Organizer and admin event card layouts (Edit, Delete, Notify, Cancel buttons) remain unchanged.
- Gallery lightbox modal (full-screen image viewer with navigation, like, download, share) remains unchanged.
- The `BackButton` component continues to render above page content on sub-pages.
- `AppSidebar` continues to render in the `hidden sm:flex` container on desktop.

**Scope:**
All inputs where `isBugCondition` returns `false` — desktop viewports, non-dashboard pages, non-customer roles — must be completely unaffected by this fix.

---

## Hypothesized Root Cause

Based on code inspection of the five affected files:

1. **Insufficient `paddingBottom` in `DashboardLayout`**: The `<main>` element uses `paddingBottom: isMainPage ? "80px" : "16px"`. The `BottomNavBar` is 70px tall, and iOS adds `env(safe-area-inset-bottom)` (typically 34px). 80px < 70 + 34 = 104px, so content is hidden behind the nav bar.

2. **`max-w-[1600px] mx-auto` wrapper**: The inner `<div className="max-w-[1600px] mx-auto">` in `DashboardLayout` is intended for large screens but on mobile it doesn't constrain width — however, combined with the 12px padding, it prevents sections from using responsive padding utilities. Replacing it with `w-full px-3 sm:px-4 md:px-6` gives sections proper responsive horizontal padding.

3. **`padding: "12px"` on `<main>`**: This inline style applies 12px padding on all sides uniformly. On mobile, this is slightly too tight and conflicts with section-level padding. Reducing to `"8px"` gives sections more breathing room.

4. **Missing `w-full` on featured event card wrappers**: In `CustomerDashboard`, the featured events grid renders cards as `<div className="group relative bg-card rounded-xl ...">` without `w-full`. Inside a `grid-cols-2` cell, the div doesn't automatically stretch to fill the cell width, causing content to overflow.

5. **Vertical gallery layout**: `EventGallery` uses `grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1.5` — on mobile this renders three narrow columns (~115px each on 375px screen) with tall cards that overflow. The fix changes this to a horizontal scroll (`flex gap-3 overflow-x-auto pb-2`) with fixed-size containers (`min-w-[160px] h-[120px]`), matching an Instagram-style scroll pattern.

6. **Vendor cards without full-width wrapper**: The popular vendors section renders cards directly in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` without a constraining wrapper on mobile, allowing card content to overflow the container.

---

## Correctness Properties

Property 1: Bug Condition — Mobile Sections Fully Visible

_For any_ mobile viewport rendering the `/dashboard` home page where `isBugCondition` returns true, the fixed layout SHALL render all sections (events grid, gallery, vendor cards, category cards, contact section) fully within the viewport width with no horizontal overflow, and all content SHALL be scrollable above the BottomNavBar without being obscured.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation — Desktop and Non-Main-Page Layout Unchanged

_For any_ input where `isBugCondition` returns false (desktop viewport ≥ 768px, non-dashboard pages, non-customer roles), the fixed code SHALL produce exactly the same rendered output as the original code, preserving all multi-column grid layouts, sidebar visibility, BottomNavBar behavior, organizer/admin card actions, and gallery lightbox functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct:

**File 1**: `frontend/src/components/DashboardLayout.tsx`

**Specific Changes**:
1. **Reduce main container padding**: Change `padding: "12px"` → `padding: "8px"` in the `<main>` inline style.
2. **Increase paddingBottom for main pages**: Change `paddingBottom: isMainPage ? "80px" : "16px"` → `paddingBottom: isMainPage ? "90px" : "16px"`.
3. **Replace max-width wrapper**: Change `<div className="max-w-[1600px] mx-auto">` → `<div className="w-full px-3 sm:px-4 md:px-6">`.

---

**File 2**: `frontend/src/pages/dashboard/CustomerDashboard.tsx`

**Specific Changes**:
1. **Fix featured events grid**: Change `<div className="grid grid-cols-2 gap-2">` → `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`.
2. **Add `w-full` to event card wrapper**: Add `w-full` to the `<div>` wrapping each featured event card inside the grid.
3. **Wrap vendor cards**: Wrap the popular vendors `<div className="group bg-white rounded-3xl ...">` in `<div className="w-full max-w-md mx-auto"><div className="p-4 rounded-xl">...</div></div>` on mobile, or apply `w-full` to the grid cell wrapper.

---

**File 3**: `frontend/src/components/EventCard.tsx`

**Specific Changes**:
1. **Add `w-full` to card root**: Add `w-full` to the `<Card>` root element's className so it fills its grid cell on mobile.

---

**File 4**: `frontend/src/components/EventGallery.tsx`

**Specific Changes**:
1. **Switch to horizontal scroll layout**: Replace `<div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1.5">` with `<div className="flex gap-3 overflow-x-auto pb-2">`.
2. **Fix image container size**: Set each image container to `min-w-[160px] h-[120px]` so items have consistent size in the horizontal scroll.

---

**File 5**: `frontend/src/components/CategoryCards.tsx`

**Specific Changes**:
1. **Full-width wrapper**: Wrap the category grid section in `<div className="w-full">` or replace `<div className="max-w-6xl mx-auto">` with `<div className="w-full px-3 sm:px-4 md:px-6">` to prevent horizontal overflow on mobile.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the overflow and overlap bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write snapshot/render tests that mount the affected components at a 375px viewport width and assert that no element has `scrollWidth > clientWidth` (horizontal overflow) and that the last section's bottom edge is above `window.innerHeight - 70` (BottomNavBar height). Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **DashboardLayout paddingBottom test**: Render `DashboardLayout` with `isMainPage=true` and assert `paddingBottom >= 90px` (will fail on unfixed code showing 80px).
2. **Events grid overflow test**: Render the featured events grid at 375px width and assert no card has `offsetWidth > parentElement.offsetWidth` (will fail on unfixed code).
3. **Gallery horizontal overflow test**: Render `EventGallery` at 375px and assert the gallery container does not have `scrollHeight > 200px` when horizontal scroll is expected (will fail on unfixed code showing vertical stack).
4. **Vendor card overflow test**: Render the vendor cards section at 375px and assert no card overflows its container (may fail on unfixed code).

**Expected Counterexamples**:
- `DashboardLayout` `<main>` has `paddingBottom: 80px` instead of `≥ 90px`.
- Event card `<div>` wrappers have `offsetWidth` exceeding their grid cell width.
- `EventGallery` renders a tall vertical stack instead of a horizontal scroll row.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed layout produces fully visible, non-overflowing sections.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := renderDashboard_fixed(X)
  ASSERT result.hasHorizontalOverflow = false
    AND result.lastSectionBottom <= (viewportHeight - bottomNavHeight)
    AND result.allSectionsVisible = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same rendered output as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderDashboard_original(X) = renderDashboard_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many viewport widths and page combinations automatically.
- It catches regressions in desktop layout that manual tests might miss.
- It provides strong guarantees that non-mobile, non-dashboard contexts are unaffected.

**Test Plan**: Observe desktop rendering on UNFIXED code first, then write property-based tests that verify the same class names and layout properties are present after the fix.

**Test Cases**:
1. **Desktop grid preservation**: At viewport ≥ 768px, verify events grid still uses `sm:grid-cols-2` or higher column count.
2. **Non-main-page paddingBottom preservation**: Render `DashboardLayout` with `isMainPage=false` and assert `paddingBottom = "16px"`.
3. **BottomNavBar unchanged**: Assert `BottomNavBar` still renders with `height: 70px`, `zIndex: 9999`, `position: fixed`.
4. **Organizer card actions preservation**: Render `EventCard` with `showActions="organizer"` and assert Edit, Delete, Notify, Cancel buttons are present.
5. **Gallery lightbox preservation**: Open the lightbox modal in `EventGallery` and assert navigation, like, download, and share buttons are present.

### Unit Tests

- Test `DashboardLayout` renders `paddingBottom: "90px"` when `isMainPage=true` and `"16px"` when `isMainPage=false`.
- Test `DashboardLayout` inner wrapper uses `w-full px-3 sm:px-4 md:px-6` class (not `max-w-[1600px] mx-auto`).
- Test `EventCard` root `<Card>` element includes `w-full` in its className.
- Test `EventGallery` gallery container uses `flex` and `overflow-x-auto` classes (not `grid`).
- Test `CategoryCards` section wrapper does not constrain width with `max-w-6xl` on mobile.

### Property-Based Tests

- Generate random viewport widths in range [320, 767] and verify no section in `CustomerDashboard` has horizontal overflow after fix.
- Generate random `isMainPage` boolean values and verify `DashboardLayout` applies correct `paddingBottom` in all cases.
- Generate random event arrays (0–10 items) and verify the events grid renders without overflow at 375px width.

### Integration Tests

- Full render of `CustomerDashboard` at 375px viewport: assert all six sections are visible and no horizontal scrollbar appears.
- Scroll to bottom of `CustomerDashboard` at 375px: assert last section is fully above the BottomNavBar.
- Render `CustomerDashboard` at 768px viewport: assert desktop multi-column layout is unchanged.
- Render `CustomerDashboard` at 1280px viewport: assert large-screen layout is unchanged.
