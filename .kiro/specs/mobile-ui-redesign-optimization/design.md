# Mobile UI Redesign Optimization Bugfix Design

## Overview

The mobile UI suffers from multiple layout and UX defects that collectively produce a cluttered, oversized, and inconsistent experience on small screens. The bugs span five components: `BrowseEventsPage` (duplicate back button), `BottomNavBar` (safe-area padding), `EventCard` (missing action buttons), `CustomerDashboard` (extraneous section), and `EventGallery` (oversized grid). The fix strategy is surgical — each change targets only the defective rendering condition while leaving all non-buggy paths untouched.

## Glossary

- **Bug_Condition (C)**: A predicate over a render input that identifies when a defect manifests
- **Property (P)**: The desired correct output when the bug condition holds
- **Preservation**: All render paths where the bug condition does NOT hold — these must produce identical output before and after the fix
- **BrowseEventsPage**: `frontend/src/pages/dashboard/BrowseEventsPage.tsx` — the browse/search page that currently renders its own back button in addition to the one from `DashboardLayout`
- **BottomNavBar**: `frontend/src/components/BottomNavBar.tsx` — the fixed-position mobile nav bar rendered for authenticated customers on the five main pages
- **EventCard**: `frontend/src/components/EventCard.tsx` — the card component that renders event info and action buttons for customer, organizer, and admin roles
- **CustomerDashboard**: `frontend/src/pages/dashboard/CustomerDashboard.tsx` — the home page for customers; currently renders an "Explore Events" section that should be removed
- **EventGallery**: `frontend/src/components/EventGallery.tsx` — the photo gallery component; currently renders large banner-style images instead of a compact 3-per-row grid
- **DashboardLayout**: `frontend/src/components/DashboardLayout.tsx` — the layout wrapper that already provides a `BackButton` on all sub-pages
- **isMobile**: Viewport width < 768px (md breakpoint in Tailwind)

## Bug Details

### Bug Condition

Five independent bug conditions are identified. Each maps to a specific component and render context.

**Formal Specification:**

```
FUNCTION isBugCondition_DuplicateBackButton(X)
  INPUT: X = { page: string, isMobile: boolean }
  OUTPUT: boolean
  RETURN X.page = "BrowseEventsPage"
         AND BrowseEventsPage renders its own <Button onClick={navigate(-1)}> back button
         AND DashboardLayout also renders <BackButton /> for this route
END FUNCTION

FUNCTION isBugCondition_NavbarCutoff(X)
  INPUT: X = { device: string }
  OUTPUT: boolean
  RETURN X.device = "mobile"
         AND (navbar.height < 70
              OR navbar.paddingBottom ≠ "env(safe-area-inset-bottom)")
END FUNCTION

FUNCTION isBugCondition_MissingCardButtons(X)
  INPUT: X = { eventStatus: string, showActions: string }
  OUTPUT: boolean
  RETURN X.showActions = "customer"
         AND X.eventStatus NOT IN ["completed", "cancelled"]
         AND NOT (hasBookNowButton(X) AND hasViewDetailsButton(X))
END FUNCTION

FUNCTION isBugCondition_ExploreEventsSection(X)
  INPUT: X = { page: string }
  OUTPUT: boolean
  RETURN X.page = "CustomerDashboard"
         AND "ExploreEvents" section is present in rendered output
END FUNCTION

FUNCTION isBugCondition_OversizedGallery(X)
  INPUT: X = { component: string, viewport: string }
  OUTPUT: boolean
  RETURN X.component = "EventGallery"
         AND X.viewport = "mobile"
         AND (imageHeight > 100 OR columnsPerRow < 3)
END FUNCTION
```

### Examples

- **Duplicate Back Button**: On mobile, navigating to `/dashboard/browse-events` shows two "Back" buttons stacked — one from `DashboardLayout`'s `BackButton` component and one from `BrowseEventsPage`'s own `<Button onClick={() => navigate(-1)}>` at line 324. Expected: only the `DashboardLayout` back button appears.

- **Navbar Cutoff**: On an iPhone with a home indicator, the bottom nav bar's last pixel row is obscured because `paddingBottom` is not set to `env(safe-area-inset-bottom)`. Expected: nav bar clears the home indicator on all notched devices.

- **Missing Card Buttons**: An active upcoming event card in customer view may render only one button or collapse the button row. Expected: both "View Details" and "Book Now" are always side-by-side at `h-8`, `text-xs`, `gap: 6px`.

- **Explore Events Section**: The `CustomerDashboard` renders an "Explore Events" section that adds excessive scroll length. Expected: only "Featured Events" and "Recommended Events" sections appear.

- **Oversized Gallery**: `EventGallery` renders each event as a large card with a `aspect-video` main image (~200px tall on mobile). Expected: a compact 3-column photo grid with image height 80–100px.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `BottomNavBar` SHALL continue to render only for authenticated customers on the five main pages (`/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, `/dashboard/profile-settings`)
- Tapping "Book Now" SHALL continue to navigate to the correct booking flow based on `eventType` (full-service → `/book-full-service/:id`, ticketed → `/book-ticketed-event/:id`, standard → `/book/event/:id`)
- Tapping "View Details" SHALL continue to open the `EventDetailModal` and log the activity via the API
- On desktop (md and above), the sidebar SHALL remain visible and the bottom nav bar SHALL remain hidden
- `DashboardLayout`'s `BackButton` SHALL continue to appear on all sub-pages (not just `/dashboard`)
- Organizer and admin action buttons (Edit, Delete, Notify, Cancel, Remove) SHALL remain unchanged
- Sold-out, cancelled, and completed event states SHALL continue to show their respective status indicators instead of action buttons
- The `EventGallery` lightbox SHALL continue to support image navigation, like/unlike, download, and share
- The dashboard search bar SHALL continue to show autocomplete suggestions and navigate to browse results

**Scope:**
All render paths where the bug conditions do NOT hold are completely unaffected by this fix. This includes:
- All desktop layouts (md breakpoint and above)
- Organizer and admin event card views
- Non-customer authenticated routes
- The `EventGallery` lightbox dialog
- All booking and payment flows

## Hypothesized Root Cause

Based on code analysis of the identified files:

1. **Duplicate Back Button — Redundant Navigation Element**: `BrowseEventsPage` (line 324) renders its own `<Button onClick={() => navigate(-1)}>` inside the page JSX. `DashboardLayout` already renders a `<BackButton />` for all routes where `location.pathname !== "/dashboard"`. Since `/dashboard/browse-events` satisfies that condition, both render simultaneously. The fix is to remove the page-internal back button entirely.

2. **Navbar Safe-Area — Missing CSS Property**: `BottomNavBar` sets `paddingBottom: "env(safe-area-inset-bottom)"` in the outer `<nav>` style but the inner flex container does not inherit this correctly on all devices. The height is already 70px. The fix is to ensure the padding is applied at the correct level and the `block md:hidden` class correctly suppresses it on desktop.

3. **Missing Card Buttons — Layout Collapse**: The `EventCard` customer action section wraps buttons in a `flex gap-1.5` div. On very narrow viewports the buttons may not both be visible if the container doesn't enforce `flex-wrap: nowrap` or minimum widths. The fix is to ensure both buttons always render with explicit sizing.

4. **Explore Events Section — Unremoved Legacy Section**: The `CustomerDashboard` contains a section that was intended to be removed during a prior redesign but was not. The fix is to delete the JSX block for that section.

5. **Oversized Gallery — Wrong Grid Layout**: `EventGallery` uses a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` layout with `aspect-video` images, which produces large cards on mobile. The fix is to change the mobile grid to 3 columns with constrained image heights.

## Correctness Properties

Property 1: Bug Condition — Single Back Button on BrowseEventsPage

_For any_ render of `BrowseEventsPage` on mobile where `DashboardLayout` is the parent, the fixed component SHALL render exactly one back button — the one provided by `DashboardLayout` — and SHALL NOT render any additional internal back button element.

**Validates: Requirements 2.1, 3.5**

Property 2: Bug Condition — BottomNavBar Safe-Area Padding

_For any_ render of `BottomNavBar` on a mobile device, the fixed component SHALL render with `height: 70px`, icon size 22–24px, label font-size 11px, and `paddingBottom: env(safe-area-inset-bottom)` so content is never obscured by the device home indicator.

**Validates: Requirements 2.2, 3.1**

Property 3: Bug Condition — EventCard Always Shows Both Action Buttons

_For any_ render of `EventCard` where `showActions = "customer"` and `eventStatus` is not `"completed"` or `"cancelled"`, the fixed component SHALL always render both a "View Details" button and a "Book Now" button side-by-side.

**Validates: Requirements 2.3, 3.2, 3.3**

Property 4: Bug Condition — CustomerDashboard Omits Explore Events Section

_For any_ render of `CustomerDashboard`, the fixed component SHALL NOT render an "Explore Events" section; only "Featured Events" and "Recommended Events" sections SHALL appear.

**Validates: Requirements 2.4, 3.8**

Property 5: Bug Condition — EventGallery Compact 3-Column Grid

_For any_ render of `EventGallery` on mobile, the fixed component SHALL display images in a 3-per-row grid with image height constrained to 80–100px, `border-radius: 8px`, `object-fit: cover`, and `gap: 6px`.

**Validates: Requirements 2.5, 3.9**

Property 6: Preservation — Non-Buggy Render Paths Unchanged

_For any_ render input where none of the five bug conditions hold (e.g., desktop layout, organizer card view, sold-out event, non-BrowseEventsPage route), the fixed components SHALL produce exactly the same output as the original components, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `frontend/src/pages/dashboard/BrowseEventsPage.tsx`

**Specific Changes**:
1. **Remove Internal Back Button**: Delete the `{window.history.length > 1 && (<Button ... onClick={() => navigate(-1)}> ... Back</Button>)}` block at lines 324–328. The `DashboardLayout` `BackButton` already handles this.
2. **Remove `ArrowLeft` import**: Remove `ArrowLeft` from the lucide-react import since it will no longer be used.

---

**File 2**: `frontend/src/components/BottomNavBar.tsx`

**Specific Changes**:
1. **Verify Safe-Area Padding**: Confirm `paddingBottom: "env(safe-area-inset-bottom)"` is on the outer `<nav>` element (already present — verify it is not overridden by the inner div).
2. **Icon and Label Sizing**: Ensure `<Icon size={24}>` and label `fontSize: "11px"` are applied consistently to all nav items.

---

**File 3**: `frontend/src/components/EventCard.tsx`

**Specific Changes**:
1. **Enforce Button Row Layout**: In the customer action section for active events, ensure the button container uses `flex gap-1.5 w-full` and both buttons have explicit `h-8 text-xs` sizing so they never collapse on narrow viewports.
2. **No logic changes**: The conditional rendering for completed/cancelled/sold-out states remains identical.

---

**File 4**: `frontend/src/pages/dashboard/CustomerDashboard.tsx`

**Specific Changes**:
1. **Remove Explore Events Section**: Locate and delete the JSX block that renders the "Explore Events" section. Only "Featured Events" and "Recommended Events" sections should remain in the events area.

---

**File 5**: `frontend/src/components/EventGallery.tsx`

**Specific Changes**:
1. **Change Grid Layout**: Replace `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `grid-cols-3` (always 3 columns) or `grid-cols-3 md:grid-cols-3 lg:grid-cols-4`.
2. **Constrain Image Height**: Replace `aspect-video` with a fixed height class (e.g., `h-[90px]`) on the image container.
3. **Reduce Card Padding**: Reduce `CardContent` padding to keep cards compact.
4. **Preserve Lightbox**: The `Dialog` lightbox and all its handlers remain completely unchanged.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Render each affected component in a mobile viewport (width < 768px) and assert the defective condition. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Duplicate Back Button Test**: Render `BrowseEventsPage` inside `DashboardLayout` at mobile width — assert that exactly 2 back button elements are present (will fail on fixed code, confirms bug on unfixed code)
2. **Navbar Height Test**: Render `BottomNavBar` and assert `paddingBottom` equals `env(safe-area-inset-bottom)` (will fail if missing on unfixed code)
3. **Card Buttons Test**: Render `EventCard` with `showActions="customer"` and an upcoming event — assert both "Book Now" and "View Details" are present (will fail on unfixed code if layout collapses)
4. **Explore Events Section Test**: Render `CustomerDashboard` and assert no element with text "Explore Events" is present (will fail on unfixed code)
5. **Gallery Grid Test**: Render `EventGallery` at mobile width and assert image container height ≤ 100px (will fail on unfixed code)

**Expected Counterexamples**:
- Two back button elements found in `BrowseEventsPage` render tree
- Gallery image containers taller than 100px on mobile viewport

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed component produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition_DuplicateBackButton(X) DO
  result := render(BrowseEventsPage_fixed, X)
  ASSERT count(backButtons, result) = 1
END FOR

FOR ALL X WHERE isBugCondition_NavbarCutoff(X) DO
  result := render(BottomNavBar_fixed, X)
  ASSERT result.paddingBottom = "env(safe-area-inset-bottom)"
  ASSERT result.height = 70
END FOR

FOR ALL X WHERE isBugCondition_MissingCardButtons(X) DO
  result := render(EventCard_fixed, X)
  ASSERT hasElement(result, "Book Now") AND hasElement(result, "View Details")
END FOR

FOR ALL X WHERE isBugCondition_ExploreEventsSection(X) DO
  result := render(CustomerDashboard_fixed, X)
  ASSERT NOT hasElement(result, "Explore Events")
END FOR

FOR ALL X WHERE isBugCondition_OversizedGallery(X) DO
  result := render(EventGallery_fixed, X)
  ASSERT imageContainerHeight(result) <= 100
  ASSERT columnsPerRow(result) = 3
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed components produce the same result as the original components.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition_DuplicateBackButton(X) DO
  ASSERT render(BrowseEventsPage_original, X) = render(BrowseEventsPage_fixed, X)
END FOR

FOR ALL X WHERE NOT isBugCondition_MissingCardButtons(X) DO
  // Organizer, admin, sold-out, completed, cancelled states
  ASSERT render(EventCard_original, X) = render(EventCard_fixed, X)
END FOR

FOR ALL X WHERE NOT isBugCondition_OversizedGallery(X) DO
  // Desktop viewport, lightbox open state
  ASSERT render(EventGallery_original, X) = render(EventGallery_fixed, X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for organizer/admin card views, desktop layouts, and lightbox interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Organizer Card Preservation**: Verify organizer action buttons (Edit, Delete, Notify, Cancel) render identically before and after fix
2. **Admin Card Preservation**: Verify admin Remove button renders identically before and after fix
3. **Sold-Out State Preservation**: Verify "Sold Out" badge and disabled button render identically before and after fix
4. **Desktop Layout Preservation**: Verify sidebar is visible and bottom nav is hidden on md+ viewports after fix
5. **Lightbox Preservation**: Verify `EventGallery` lightbox opens, navigates images, and supports like/download/share after fix
6. **Booking Flow Preservation**: Verify "Book Now" tap navigates to correct route for each `eventType` after fix

### Unit Tests

- Test that `BrowseEventsPage` renders exactly one back button when inside `DashboardLayout`
- Test that `BottomNavBar` renders with correct height and safe-area padding
- Test that `EventCard` with `showActions="customer"` and active event always has both action buttons
- Test that `CustomerDashboard` does not render an "Explore Events" section
- Test that `EventGallery` renders a 3-column grid with constrained image heights on mobile

### Property-Based Tests

- Generate random event objects with varying `status`, `eventType`, and `showActions` values — verify that organizer/admin/sold-out/completed/cancelled card outputs are identical before and after fix
- Generate random viewport widths above 768px — verify desktop layout (sidebar visible, bottom nav hidden) is unchanged
- Generate random gallery data sets — verify lightbox state and image navigation work correctly after grid layout change

### Integration Tests

- Full navigation flow: land on `/dashboard` → tap "Events" in bottom nav → verify only one back button on `/dashboard/browse-events`
- Full booking flow: tap "Book Now" on a ticketed event card → verify navigation to `/book-ticketed-event/:id`
- Full gallery flow: open `EventGallery` → tap an image → verify lightbox opens with correct image and navigation works
- Context switching: navigate between all five main pages via bottom nav — verify nav bar remains visible and correctly highlights active tab
