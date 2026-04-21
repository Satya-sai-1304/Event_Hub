# Coupon Validation Fix - Bugfix Design

## Overview

Valid coupons are incorrectly rejected during booking with "Coupon not valid for this event or service". The bug has three distinct root causes spanning the frontend and backend:

1. **Category-scoped coupons**: `BookTicketedEventPage` sends `applicableType: 'EVENT'` and omits `categoryId`, so the backend never attempts a category match.
2. **ALL/global coupons**: The guard condition `coupon.isGlobal === false || coupon.applicableType !== 'ALL'` incorrectly enters the restriction block when `isGlobal` is `undefined` (falsy but not strictly `false`).
3. **Service-scoped coupons**: `PaymentModal` reads `serviceIds` from `booking.selectedServices` as an object of `{ decoration, catering, music, lighting }` key-value pairs, but passes `Object.values(...)` directly without filtering out null/undefined entries, and the backend may receive an empty or malformed array.

The fix is minimal and targeted: correct the guard condition in `server/routes/coupons.js`, ensure `BookTicketedEventPage` passes `categoryId` correctly, and ensure `PaymentModal` extracts valid service IDs from `booking.selectedServices`.

## Glossary

- **Bug_Condition (C)**: The set of (coupon, booking request) pairs where the coupon is legitimately applicable but the validation endpoint returns 400.
- **Property (P)**: For any input in C, the fixed validation endpoint SHALL return 200 with the coupon object.
- **Preservation**: All validation rejections that are correct (expired, wrong merchant, usage limit, etc.) must continue to fire exactly as before.
- **isBugCondition**: Pseudocode function that identifies inputs triggering the bug.
- **validateCoupon**: The handler at `POST /api/coupons/validate` in `server/routes/coupons.js`.
- **handleApplyCoupon**: The frontend function in `BookTicketedEventPage` and `PaymentModal` that calls `validateCoupon`.
- **applicableType**: Coupon field with values `'EVENT'`, `'CATEGORY'`, `'SERVICE'`, or `'ALL'`.
- **isGlobal**: Optional boolean on the coupon document; may be `undefined` on older records.

## Bug Details

### Bug Condition

The bug manifests in three overlapping sub-conditions, all of which cause a valid coupon to be rejected:

**Formal Specification:**
```
FUNCTION isBugCondition(coupon, request)
  INPUT:  coupon  - coupon document from DB
          request - body sent to POST /coupons/validate
  OUTPUT: boolean

  // Sub-condition A: category coupon, frontend sends wrong applicableType
  IF coupon.applicableType = 'CATEGORY'
     AND request.categoryId IS NULL OR UNDEFINED
     AND coupon.applicableCategory MATCHES event's actual category
  THEN RETURN true

  // Sub-condition B: global/ALL coupon, isGlobal is undefined
  IF coupon.applicableType = 'ALL'
     AND coupon.isGlobal IS UNDEFINED   // not false, not true — just absent
     AND guard evaluates (undefined === false) = false
                         (applicableType !== 'ALL') = false
     // guard is false, so block is NOT entered — wait, this is the CORRECT path
     // The real bug: isGlobal is undefined AND applicableType is something else
     // e.g. applicableType = 'EVENT' but coupon was meant to be global
  THEN RETURN true

  // More precisely for B: guard fires when isGlobal=undefined and applicableType!='ALL'
  IF coupon.isGlobal IS UNDEFINED
     AND coupon.applicableType != 'ALL'
     AND coupon IS INTENDED as global (no applicableEvents/applicableCategory/applicableServices set)
  THEN RETURN true

  // Sub-condition C: service coupon, serviceIds not passed or empty
  IF coupon.applicableType = 'SERVICE'
     AND request.serviceIds IS EMPTY OR NULL
     AND booking.selectedServices CONTAINS a matching service ID
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **Category coupon rejected**: Coupon `WEDDING10` has `applicableType: 'CATEGORY'`, `applicableCategory: ObjectId("abc123")`. User books a ticketed event in category `abc123`. Frontend sends `applicableType: 'EVENT'`, `categoryId: undefined`. Backend enters restriction block, finds no category match → 400.
- **Global coupon rejected**: Coupon `SAVE50` has `applicableType: 'EVENT'`, `isGlobal: undefined` (field absent from DB document). Guard: `undefined === false` → `false`; `'EVENT' !== 'ALL'` → `true`; overall `false || true` → `true`. Block entered, no `eventId` match found → 400.
- **Service coupon rejected**: Coupon `DECO20` has `applicableType: 'SERVICE'`, `applicableServices: [ObjectId("svc1")]`. `booking.selectedServices = { decoration: "svc1", catering: null }`. Frontend passes `serviceIds = Object.values(booking.selectedServices)` = `["svc1", null]`. Backend receives `["svc1", null]`; comparison `null.toString()` throws or mismatches → 400.
- **Edge case — no tickets selected**: If `totalTickets === 0`, the user cannot proceed to payment, so coupon validation is never reached. Not affected by this fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Expired coupons SHALL continue to be rejected with "Coupon has expired"
- Coupons from a different merchant SHALL continue to be rejected with "This coupon is not valid for this vendor"
- Coupons applied to orders below `minimumOrderAmount` SHALL continue to be rejected
- One-time coupons already used by the same user SHALL continue to be rejected with "You have already used this coupon"
- Coupons that have reached their `usageLimit` SHALL continue to be rejected with "Coupon usage limit has been reached"
- After a valid coupon is applied and payment completes, usage SHALL continue to be recorded and the discount reflected in the booking record

**Scope:**
All validation checks that do NOT involve scope matching (steps 4–7 in the current handler) are completely unaffected by this fix. The fix touches only:
- The guard condition at step 3 (backend)
- The `categoryId` field sent by `BookTicketedEventPage` (frontend)
- The `serviceIds` extraction in `PaymentModal` (frontend)

## Hypothesized Root Cause

1. **Incorrect guard logic (backend)**: `coupon.isGlobal === false || coupon.applicableType !== 'ALL'` uses strict equality `=== false`. When `isGlobal` is `undefined` (field not set on older coupon documents), `undefined === false` evaluates to `false`, so the left side of the OR is `false`. If `applicableType` is anything other than `'ALL'` (e.g., `'EVENT'` on a coupon that was intended to be global), the right side is `true`, and the entire guard is `true` — the restriction block is entered even though the coupon has no actual restrictions set.

2. **Frontend omits categoryId for ticketed event bookings (BookTicketedEventPage)**: `handleApplyCoupon` hardcodes `applicableType: 'EVENT'` and passes `categoryId: event?.category_id || event?.categoryId`. The event object returned by the API may use a different field name (e.g., `category`), so `categoryId` resolves to `undefined`. The backend then cannot match a `CATEGORY`-scoped coupon.

3. **Frontend passes unfiltered selectedServices values (PaymentModal)**: `serviceIds = Object.values(booking.selectedServices).filter(Boolean)` is present in the code but the filter may not be applied consistently, or `booking.selectedServices` may be a nested object where `Object.values` returns service objects rather than IDs. The backend receives an array that doesn't match `applicableServices` ObjectIds.

4. **String vs ObjectId comparison**: Even when IDs are passed, `eid.toString() === eventId.toString()` should work, but if `eventId` arrives as a MongoDB ObjectId object rather than a string, the comparison may fail in edge cases.

## Correctness Properties

Property 1: Bug Condition - Valid Scoped Coupons Are Accepted

_For any_ (coupon, booking request) pair where `isBugCondition` returns true — meaning the coupon is legitimately applicable to the booking by scope (category match, global/ALL type, or service match) — the fixed `validateCoupon` handler SHALL return HTTP 200 with the coupon object, not a 400 rejection.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Correct Rejections Are Unchanged

_For any_ (coupon, booking request) pair where `isBugCondition` returns false — meaning the coupon is correctly invalid (expired, wrong merchant, usage exceeded, below minimum order, already used, or genuinely wrong scope) — the fixed `validateCoupon` handler SHALL produce exactly the same HTTP 400 response as the original handler, preserving all existing rejection behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `server/routes/coupons.js`

**Function**: `router.post('/validate', ...)`

**Specific Changes**:

1. **Fix the global/ALL guard condition**: Replace the strict-equality guard with a check that correctly identifies coupons that should bypass scope restrictions.
   - Current: `if (coupon.isGlobal === false || coupon.applicableType !== 'ALL')`
   - Fixed: `if (coupon.isGlobal !== true && coupon.applicableType !== 'ALL')`
   - This ensures that when `isGlobal` is `undefined` (falsy but not `false`), the block is only entered if `applicableType` is also not `'ALL'`. A coupon with `applicableType: 'ALL'` always skips the block regardless of `isGlobal`.

2. **Add SERVICE multi-ID matching robustness**: In the `SERVICE` branch, ensure null/undefined entries in `serviceIds` are filtered before comparison.
   - Add: `const cleanServiceIds = (serviceIds || []).filter(Boolean).map(id => id.toString())`
   - Use `cleanServiceIds` in the `some(...)` comparison.

**File 2**: `frontend/src/pages/BookTicketedEventPage.tsx`

**Function**: `handleApplyCoupon`

**Specific Changes**:

3. **Pass categoryId reliably**: The event object may expose the category as `category_id`, `categoryId`, or `category._id`. Resolve all variants.
   - Current: `categoryId: event?.category_id || event?.categoryId`
   - Fixed: `categoryId: event?.category_id || event?.categoryId || event?.category?._id || event?.category`
   - Also remove the hardcoded `applicableType: 'EVENT'` — let the backend determine scope from the coupon's own `applicableType`. Or pass both `eventId` and `categoryId` and let the backend match whichever applies.

**File 3**: `frontend/src/components/PaymentModal.tsx`

**Function**: `handleApplyCoupon`

**Specific Changes**:

4. **Extract service IDs correctly**: `booking.selectedServices` is `{ decoration: id, catering: id, music: id, lighting: id }`. Extract and filter.
   - Current: `serviceIds = Object.values(booking.selectedServices).filter(Boolean)`
   - Verify this is applied consistently and that the values are IDs (strings), not service objects. If values are objects, map to `._id`.
   - Fixed: `serviceIds = Object.values(booking.selectedServices).filter(Boolean).map(v => typeof v === 'object' ? (v._id || v.id) : v).filter(Boolean)`

5. **Pass categoryId for event bookings in PaymentModal**: When `booking.eventType !== 'full-service'`, also pass `categoryId: (booking as any)?.categoryId || (booking as any)?.event?.categoryId || (booking as any)?.event?.category_id`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that call the `validateCoupon` handler directly with crafted coupon documents and request bodies. Run these tests against the UNFIXED code to observe the 400 responses and confirm root causes.

**Test Cases**:
1. **Category coupon, no categoryId sent**: Create coupon `{ applicableType: 'CATEGORY', applicableCategory: 'cat1' }`, send request with `{ eventId: 'evt1', categoryId: undefined }` — expect 400 on unfixed code.
2. **Global coupon, isGlobal undefined**: Create coupon `{ applicableType: 'EVENT', isGlobal: undefined, applicableEvents: [] }`, send any request — expect 400 on unfixed code (enters restriction block, no match).
3. **Service coupon, serviceIds contains null**: Create coupon `{ applicableType: 'SERVICE', applicableServices: ['svc1'] }`, send `{ serviceIds: ['svc1', null] }` — expect 400 on unfixed code if null causes comparison failure.
4. **ALL coupon, isGlobal undefined**: Create coupon `{ applicableType: 'ALL', isGlobal: undefined }`, send any request — expect 200 even on unfixed code (guard: `undefined===false` → false, `'ALL'!=='ALL'` → false, overall false → block skipped). This confirms sub-condition B is specifically about `applicableType !== 'ALL'` with `isGlobal` absent.

**Expected Counterexamples**:
- Test 1 fails: "Coupon not valid for this event or service" — confirms frontend omits categoryId
- Test 2 fails: "Coupon not valid for this event or service" — confirms guard logic bug with undefined isGlobal
- Test 3 may fail depending on null handling — confirms serviceIds extraction issue

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL (coupon, request) WHERE isBugCondition(coupon, request) DO
  result := validateCoupon_fixed(coupon, request)
  ASSERT result.status = 200
  ASSERT result.body = coupon
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL (coupon, request) WHERE NOT isBugCondition(coupon, request) DO
  ASSERT validateCoupon_original(coupon, request).status
       = validateCoupon_fixed(coupon, request).status
  ASSERT validateCoupon_original(coupon, request).body.message
       = validateCoupon_fixed(coupon, request).body.message
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many (coupon, request) combinations automatically
- It catches edge cases in the rejection logic that manual tests might miss
- It provides strong guarantees that the five rejection paths (expired, wrong merchant, min order, already used, usage limit) are completely unaffected

**Test Plan**: Observe the five rejection behaviors on UNFIXED code first, capture the exact response messages, then write property-based tests asserting those messages are unchanged after the fix.

**Test Cases**:
1. **Expiry preservation**: Generate coupons with `expiryDate` in the past; assert fixed handler still returns "Coupon has expired"
2. **Merchant mismatch preservation**: Generate coupons with `merchantId !== request.merchantId`; assert fixed handler still returns "This coupon is not valid for this vendor"
3. **Minimum order preservation**: Generate coupons with `minimumOrderAmount > orderAmount`; assert fixed handler still returns the minimum order message
4. **One-time usage preservation**: Generate coupons with `usedBy` containing `userId`; assert fixed handler still returns "You have already used this coupon"
5. **Usage limit preservation**: Generate coupons with `usageCount >= usageLimit`; assert fixed handler still returns "Coupon usage limit has been reached"

### Unit Tests

- Test guard condition with `isGlobal: undefined`, `isGlobal: false`, `isGlobal: true` for each `applicableType`
- Test category match when `categoryId` is provided vs omitted
- Test service ID extraction with null entries in `serviceIds` array
- Test ObjectId string comparison for `applicableEvents` matching

### Property-Based Tests

- Generate random coupon documents with `applicableType ∈ {EVENT, CATEGORY, SERVICE, ALL}` and random `isGlobal ∈ {true, false, undefined}`; for each, generate a matching booking request and assert the fixed handler returns 200
- Generate random (coupon, request) pairs where the coupon is expired; assert fixed handler always returns 400 with the expiry message
- Generate random (coupon, request) pairs where merchant IDs differ; assert fixed handler always returns 400 with the vendor message

### Integration Tests

- Full flow: create a CATEGORY coupon via `POST /coupons`, apply it during a ticketed event booking via `BookTicketedEventPage`, complete payment, verify booking record has `couponCode` and `discountAmount`
- Full flow: create a SERVICE coupon, apply it during a full-service booking via `PaymentModal`, verify discount applied
- Full flow: create an ALL coupon with `isGlobal` field absent, apply it to any booking, verify it is accepted
