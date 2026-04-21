# Bugfix Requirements Document

## Introduction

When a user applies a coupon during event booking (via `BookTicketedEventPage`), the backend validation at `POST /api/coupons/validate` returns a 400 error with "Coupon not valid for this event or service", even when the coupon was created for a matching scope (e.g., a category named "wedding"). This causes the booking to fail with a 400 on `POST /api/bookings`.

The root cause is a mismatch between how coupons are scoped at creation time and how the validation logic resolves the scope at booking time. Specifically:

- Coupons scoped to a **category** (e.g., `applicableType: 'CATEGORY'`) require a `categoryId` to be passed during validation, but the frontend sends `applicableType: 'EVENT'` for ticketed event bookings and does not reliably pass the event's `categoryId`.
- Coupons scoped to a **service type** (e.g., `applicableType: 'SERVICE'`) require matching `serviceId` or `serviceIds`, but the frontend may not pass these correctly for full-service bookings.
- Coupons scoped to **all** (`applicableType: 'ALL'` or `isGlobal: true`) should always pass but the guard condition `coupon.isGlobal === false || coupon.applicableType !== 'ALL'` can incorrectly enter the restriction-check block when `isGlobal` is `undefined` (falsy but not `false`).

The fix must ensure all four coupon scope types — event, service, category, and all/global — validate correctly when applied to a matching booking.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a coupon has `applicableType: 'CATEGORY'` and the user applies it during a ticketed event booking THEN the system returns "Coupon not valid for this event or service" because the frontend sends `applicableType: 'EVENT'` and omits or fails to resolve the event's `categoryId`

1.2 WHEN a coupon has `applicableType: 'ALL'` or `isGlobal` is `undefined` (not explicitly `true`) THEN the system incorrectly enters the scope-restriction check block and may reject the coupon

1.3 WHEN a coupon has `applicableType: 'SERVICE'` and the user applies it during a full-service booking THEN the system returns "Coupon not valid for this event or service" because `serviceIds` from `booking.selectedServices` are not correctly extracted and passed to the validate endpoint

1.4 WHEN a coupon has `applicableType: 'EVENT'` and the user applies it during a ticketed event booking THEN the system returns "Coupon not valid for this event or service" because the `eventId` sent by the frontend does not match the ObjectId stored in `applicableEvents`

### Expected Behavior (Correct)

2.1 WHEN a coupon has `applicableType: 'CATEGORY'` and the booking's event belongs to that category THEN the system SHALL accept the coupon by resolving the event's `categoryId` on the backend (or ensuring the frontend passes it) and matching it against `applicableCategory`

2.2 WHEN a coupon has `applicableType: 'ALL'` or `isGlobal` is `true` or `undefined` THEN the system SHALL skip the scope-restriction check entirely and accept the coupon as universally valid

2.3 WHEN a coupon has `applicableType: 'SERVICE'` and the booking includes at least one service that matches `applicableServices` THEN the system SHALL accept the coupon by correctly extracting and comparing service IDs from the booking

2.4 WHEN a coupon has `applicableType: 'EVENT'` and the booking's `eventId` matches an entry in `applicableEvents` THEN the system SHALL accept the coupon

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a coupon has expired THEN the system SHALL CONTINUE TO reject it with "Coupon has expired"

3.2 WHEN a coupon's `merchantId` does not match the booking's organizer THEN the system SHALL CONTINUE TO reject it with "This coupon is not valid for this vendor"

3.3 WHEN the order amount is below the coupon's `minimumOrderAmount` THEN the system SHALL CONTINUE TO reject it with the minimum order amount message

3.4 WHEN a user has already used a one-time coupon THEN the system SHALL CONTINUE TO reject it with "You have already used this coupon"

3.5 WHEN a coupon's usage limit has been reached THEN the system SHALL CONTINUE TO reject it with "Coupon usage limit has been reached"

3.6 WHEN a valid coupon is applied and payment completes THEN the system SHALL CONTINUE TO record the coupon usage and reflect the discount in the booking record
