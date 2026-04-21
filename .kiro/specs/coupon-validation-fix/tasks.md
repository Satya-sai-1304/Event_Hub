# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Valid Scoped Coupons Rejected
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists across all three sub-conditions
  - **Scoped PBT Approach**: Scope the property to the three concrete failing cases from the design
  - Test Sub-condition A: call `POST /coupons/validate` with a CATEGORY coupon (`applicableType: 'CATEGORY'`, `applicableCategory: 'cat1'`) and a request body where `categoryId` is `undefined` — assert 200, expect 400 on unfixed code
  - Test Sub-condition B: call `POST /coupons/validate` with a coupon where `applicableType: 'EVENT'`, `isGlobal: undefined`, `applicableEvents: []` — assert 200, expect 400 on unfixed code (guard enters restriction block, no event match)
  - Test Sub-condition C: call `POST /coupons/validate` with a SERVICE coupon (`applicableType: 'SERVICE'`, `applicableServices: ['svc1']`) and `serviceIds: ['svc1', null]` — assert 200, expect 400 on unfixed code
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., "CATEGORY coupon returns 400 when categoryId omitted", "isGlobal=undefined guard fires incorrectly")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Correct Rejections Are Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: expired coupon → "Coupon has expired"
  - Observe on UNFIXED code: wrong merchantId → "This coupon is not valid for this vendor"
  - Observe on UNFIXED code: orderAmount below minimumOrderAmount → minimum order message
  - Observe on UNFIXED code: userId already in usedBy → "You have already used this coupon"
  - Observe on UNFIXED code: usageCount >= usageLimit → "Coupon usage limit has been reached"
  - Write property-based tests: for all (coupon, request) pairs where isBugCondition returns false (expired / wrong merchant / below min order / already used / usage limit exceeded), assert the handler returns HTTP 400 with the same message observed above
  - Use a PBT library (e.g., fast-check for JS) to generate random coupon documents for each rejection category
  - Verify all five preservation tests PASS on UNFIXED code before implementing the fix
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline rejection behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix coupon validation across backend and frontend

  - [ ] 3.1 Fix guard condition in `server/routes/coupons.js`
    - Locate `router.post('/validate', ...)` in `server/routes/coupons.js`
    - Replace: `if (coupon.isGlobal === false || coupon.applicableType !== 'ALL')`
    - With: `if (coupon.isGlobal !== true && coupon.applicableType !== 'ALL')`
    - This ensures `isGlobal: undefined` no longer incorrectly enters the restriction block when `applicableType` is not `'ALL'`
    - In the SERVICE branch, add null filtering: `const cleanServiceIds = (serviceIds || []).filter(Boolean).map(id => id.toString())` and use `cleanServiceIds` in the `some(...)` comparison
    - _Bug_Condition: isBugCondition sub-conditions B and C — isGlobal undefined guard fires; serviceIds contains null entries_
    - _Expected_Behavior: validateCoupon returns HTTP 200 for all (coupon, request) pairs where isBugCondition is true_
    - _Preservation: All five rejection paths (expired, wrong merchant, min order, already used, usage limit) are in separate guard blocks above this change and are unaffected_
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Fix `categoryId` resolution in `frontend/src/pages/BookTicketedEventPage.tsx`
    - Locate `handleApplyCoupon` in `BookTicketedEventPage.tsx`
    - Replace: `categoryId: event?.category_id || event?.categoryId`
    - With: `categoryId: event?.category_id || event?.categoryId || event?.category?._id || event?.category`
    - This covers all field name variants the API may return for the event's category
    - _Bug_Condition: isBugCondition sub-condition A — frontend omits categoryId so backend cannot match CATEGORY-scoped coupon_
    - _Expected_Behavior: CATEGORY coupon is accepted when the event belongs to the matching category_
    - _Requirements: 2.1_

  - [ ] 3.3 Fix `serviceIds` extraction and `categoryId` pass-through in `frontend/src/components/PaymentModal.tsx`
    - Locate `handleApplyCoupon` in `PaymentModal.tsx`
    - Replace the `serviceIds` extraction line with: `serviceIds = Object.values(booking.selectedServices).filter(Boolean).map(v => typeof v === 'object' ? (v._id || v.id) : v).filter(Boolean)`
    - For non-full-service bookings, add: `categoryId = (booking as any)?.categoryId || (booking as any)?.event?.categoryId || (booking as any)?.event?.category_id`
    - _Bug_Condition: isBugCondition sub-condition C — serviceIds array contains null/undefined entries causing comparison failure_
    - _Expected_Behavior: SERVICE coupon is accepted when booking includes a matching service ID_
    - _Requirements: 2.3, 2.4_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Valid Scoped Coupons Accepted
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior for all three sub-conditions
    - When this test passes, it confirms the fixed handler returns 200 for all isBugCondition inputs
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Correct Rejections Are Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all five preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in expiry, merchant, min order, already-used, and usage-limit rejection paths)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite covering both the exploration test (task 1) and preservation tests (task 2)
  - Confirm Property 1 (bug condition) now passes — valid scoped coupons are accepted
  - Confirm Property 2 (preservation) still passes — all five rejection paths are unchanged
  - Ensure all tests pass; ask the user if questions arise
