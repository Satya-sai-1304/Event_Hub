# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Mobile Home Page Overflow
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the overflow and BottomNavBar overlap bugs
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases on a 375px-wide mobile viewport rendering `/dashboard`
  - Create test file at `frontend/src/components/__tests__/home-page-overflow-fix.test.tsx`
  - Test 1 — DashboardLayout paddingBottom: render `DashboardLayout` with `isMainPage=true` and assert `paddingBottom >= "90px"` (will fail showing `"80px"`)
  - Test 2 — Inner wrapper class: assert the inner `<div>` uses `w-full px-3 sm:px-4 md:px-6` and NOT `max-w-[1600px] mx-auto` (will fail on unfixed code)
  - Test 3 — Main container padding: assert `<main>` has `padding: "8px"` (will fail showing `"12px"`)
  - Test 4 — Events grid layout: render the featured events grid and assert it uses `grid-cols-1 sm:grid-cols-2` (will fail showing `grid-cols-2`)
  - Test 5 — EventGallery horizontal scroll: render `EventGallery` and assert the gallery container uses `flex` and `overflow-x-auto` classes (will fail showing `grid`)
  - Test 6 — EventCard w-full: render `EventCard` and assert the root `<Card>` element includes `w-full` in its className (will fail on unfixed code)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `paddingBottom: "80px"` instead of `"90px"`, gallery uses `grid grid-cols-3` instead of `flex overflow-x-auto`)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Desktop and Non-Main-Page Layout Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (desktop ≥ 768px, non-main pages, organizer/admin cards, gallery lightbox)
  - Add preservation tests to `frontend/src/components/__tests__/home-page-overflow-fix.test.tsx`
  - Observe: `DashboardLayout` with `isMainPage=false` renders `paddingBottom: "16px"` on unfixed code — write test asserting this
  - Observe: `BottomNavBar` renders with `height: 70px`, `zIndex: 9999`, `position: fixed` on unfixed code — write test asserting these values are unchanged
  - Observe: `EventCard` with `showActions="organizer"` renders Edit, Delete, Notify, Cancel buttons on unfixed code — write test asserting all four buttons are present
  - Observe: `EventGallery` lightbox modal renders with navigation (ChevronLeft, ChevronRight), Heart, Download, Share2 buttons on unfixed code — write test asserting all are present
  - Write property-based test: for any boolean value of `isMainPage`, `DashboardLayout` applies `paddingBottom: "90px"` when true and `"16px"` when false (after fix, but baseline observed now)
  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix mobile home page overflow and BottomNavBar overlap

  - [x] 3.1 Fix DashboardLayout main container padding and inner wrapper
    - In `frontend/src/components/DashboardLayout.tsx`:
    - Change `padding: "12px"` → `padding: "8px"` in the `<main>` inline style
    - Change `paddingBottom: isMainPage ? "80px" : "16px"` → `paddingBottom: isMainPage ? "90px" : "16px"`
    - Change `<div className="max-w-[1600px] mx-auto">` → `<div className="w-full px-3 sm:px-4 md:px-6">`
    - _Bug_Condition: isBugCondition(X) where X.viewport="mobile" AND X.page="/dashboard" AND X.section="main-container"_
    - _Expected_Behavior: padding="8px", paddingBottom="90px" when isMainPage=true, inner wrapper uses w-full px-3 sm:px-4 md:px-6_
    - _Preservation: isMainPage=false still gets paddingBottom="16px"; desktop sidebar and AppSidebar layout unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5_

  - [x] 3.2 Fix featured events grid and event card wrappers in CustomerDashboard
    - In `frontend/src/pages/dashboard/CustomerDashboard.tsx`:
    - Change `<div className="grid grid-cols-2 gap-2">` → `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">` for the featured events grid
    - Add `w-full` to the `<div className="group relative bg-card rounded-xl ...">` wrapper inside the featured events grid so each card fills its cell
    - Wrap each vendor card `<div className="group bg-white rounded-3xl ...">` in `<div className="w-full max-w-md mx-auto"><div className="p-4 rounded-xl">...</div></div>`
    - _Bug_Condition: isBugCondition(X) where X.section IN ["events-grid", "vendor-cards"]_
    - _Expected_Behavior: events grid uses grid-cols-1 sm:grid-cols-2 gap-3; each card wrapper has w-full; vendor cards constrained with max-w-md mx-auto_
    - _Preservation: desktop sm:grid-cols-2 lg:grid-cols-4 vendor grid layout unchanged at ≥ 768px_
    - _Requirements: 2.4, 2.6, 3.1, 3.6_

  - [x] 3.3 Add w-full to EventCard root element
    - In `frontend/src/components/EventCard.tsx`:
    - Add `w-full` to the `<Card>` root element className: `<Card className="w-full group overflow-hidden rounded-xl ...">`
    - _Bug_Condition: isBugCondition(X) where X.section="events-grid"_
    - _Expected_Behavior: EventCard root Card element has w-full so it fills its grid cell on mobile_
    - _Preservation: organizer/admin card action buttons (Edit, Delete, Notify, Cancel, Remove) and layout unchanged_
    - _Requirements: 2.4, 3.6_

  - [x] 3.4 Fix EventGallery to use horizontal scroll layout
    - In `frontend/src/components/EventGallery.tsx`:
    - Replace `<div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1.5">` with `<div className="flex gap-3 overflow-x-auto pb-2">`
    - Set each image container to `min-w-[160px] h-[120px] rounded-lg overflow-hidden` for consistent sizing in horizontal scroll
    - _Bug_Condition: isBugCondition(X) where X.section="gallery"_
    - _Expected_Behavior: gallery uses flex gap-3 overflow-x-auto pb-2; each image container is min-w-[160px] h-[120px]_
    - _Preservation: gallery lightbox modal (Dialog) with navigation, Heart, Download, Share2 buttons remains unchanged_
    - _Requirements: 2.5, 3.7_

  - [x] 3.5 Fix CategoryCards wrapper to prevent horizontal overflow
    - In `frontend/src/components/CategoryCards.tsx`:
    - Replace `<div className="max-w-6xl mx-auto">` with `<div className="w-full px-3 sm:px-4 md:px-6">`
    - _Bug_Condition: isBugCondition(X) where X.section="contact-section"_
    - _Expected_Behavior: category section wrapper uses w-full px-3 sm:px-4 md:px-6 so it does not overflow on mobile_
    - _Preservation: desktop grid grid-cols-2 md:grid-cols-4 category layout unchanged at ≥ 768px_
    - _Requirements: 2.1, 3.1_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Mobile Home Page Overflow
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all six layout defects
    - Run all exploration tests from step 1 against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (confirms all six overflow/overlap bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Desktop and Non-Main-Page Layout Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in desktop layout, non-main-page padding, BottomNavBar, organizer card actions, gallery lightbox)
    - Confirm all preservation tests still pass after fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `cd frontend && npx vitest run src/components/__tests__/home-page-overflow-fix.test.tsx`
  - Ensure all Property 1 (Bug Condition) tests pass — confirming all six layout defects are fixed
  - Ensure all Property 2 (Preservation) tests pass — confirming no regressions
  - If any test fails, investigate and fix before marking complete
  - Ask the user if questions arise
