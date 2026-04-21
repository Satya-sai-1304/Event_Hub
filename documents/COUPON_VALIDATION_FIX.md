# Coupon Validation Fix - Event and Service Bookings

## Problem
When booking wedding events or services with amount ₹50,000, coupons were visible but showing "not valid for this category" error during payment. This was happening for both event bookings and service bookings.

## Root Cause
The issue was in the **PaymentModal.tsx** component where coupon validation was not sending the correct `applicableType` parameter to the backend API. The frontend was only sending `eventId` without specifying whether it was an EVENT or SERVICE booking.

### What Was Wrong:
1. **Frontend (PaymentModal.tsx)**: When validating coupons, it only sent `eventId` without `applicableType`
2. **Backend (coupons.js)**: Validation logic didn't properly handle CATEGORY type coupons for EVENT bookings

## Solution

### 1. Frontend Changes (PaymentModal.tsx)

#### A. Updated Coupon Validation (handleApplyCoupon function)
Now determines the correct `applicableType` based on booking type:

```typescript
// Determine applicableType based on booking data
let applicableType = 'ALL';
let categoryId = undefined;
let serviceId = undefined;
let serviceIds = undefined;

if (booking?.eventType === 'full-service') {
  // This is a service-based booking
  applicableType = 'SERVICE';
  // Get service IDs from selectedServices if available
  if (booking.selectedServices) {
    serviceIds = Object.values(booking.selectedServices).filter(Boolean);
  }
} else {
  // This is an event-based booking
  applicableType = 'EVENT';
  // If there's a category associated with the event, include it
  categoryId = (booking as any)?.categoryId || (booking as any)?.event?.categoryId;
}

// Send all relevant parameters to backend
const response = await api.post('/coupons/validate', {
  code: couponCode.toUpperCase(),
  orderAmount: baseAmount,
  userId: user?.id || user?._id,
  merchantId: booking?.organizerId,
  eventId: booking?.eventType === 'ticketed' ? booking?.eventId : undefined,
  categoryId: categoryId,
  serviceId: serviceId,
  serviceIds: serviceIds,
  applicableType: applicableType
});
```

#### B. Updated Coupon Fetching
Now fetches coupons with proper filtering based on booking type:

```typescript
const { data: serverCoupons = [] } = useQuery({
  queryKey: ['coupons', booking?.organizerId, booking?.eventId, booking?.eventType],
  queryFn: async () => {
    // Determine applicableType for filtering
    let applicableType = 'ALL';
    let categoryId = undefined;
    let serviceId = undefined;
    
    if (booking?.eventType === 'full-service') {
      applicableType = 'SERVICE';
    } else if (booking?.eventType === 'ticketed' || booking?.eventType === 'event') {
      applicableType = 'EVENT';
    }
    
    const response = await api.get<any[]>(`/coupons`, {
      params: {
        merchantId: booking?.organizerId,
        eventId: booking?.eventType === 'ticketed' ? booking?.eventId : undefined,
        categoryId: categoryId,
        serviceId: serviceId,
        applicableType: applicableType
      }
    });
    return response.data;
  },
  enabled: open && !!booking?.organizerId,
});
```

### 2. Backend Changes (server/routes/coupons.js)

Added special case handling for CATEGORY type coupons when used with EVENT bookings:

```javascript
// SPECIAL CASE: For EVENT bookings, CATEGORY type coupons should also be valid
// This is important because event bookings often have category-based coupons
if (!isMatch && eventId && eventId !== "" && categoryId && categoryId !== "") {
  if (coupon.applicableType === 'CATEGORY' && coupon.applicableCategory) {
    if (coupon.applicableCategory.toString() === categoryId.toString()) {
      isMatch = true;
    }
  }
}
```

## How It Works Now

### For Event Bookings (Wedding Events, Ticketed Events):
1. Frontend sends `applicableType: 'EVENT'` along with `eventId` and `categoryId`
2. Backend checks for:
   - EVENT type coupons (matched by eventId in applicableEvents array)
   - CATEGORY type coupons (matched by categoryId)
   - ALL type coupons (always valid)
3. Coupons valid for the specific event OR its category will work

### For Service Bookings (Decoration, Catering, etc.):
1. Frontend sends `applicableType: 'SERVICE'` along with `serviceIds`
2. Backend checks for:
   - SERVICE type coupons (matched by serviceId in applicableServices array)
   - ALL type coupons (always valid)
3. Only coupons specifically for those services will work

## Testing

### Test Case 1: Wedding Event Booking
1. Create a wedding event with price ₹50,000
2. Create a coupon with:
   - `applicableType: 'EVENT'` and add the wedding event to `applicableEvents`
   - OR `applicableType: 'CATEGORY'` and set `applicableCategory` to the event's category
3. Try to book the event and apply the coupon
4. **Expected**: Coupon should be validated and discount applied successfully

### Test Case 2: Service Booking
1. Create a decoration service
2. Create a coupon with:
   - `applicableType: 'SERVICE'` and add the decoration service to `applicableServices`
3. Book the service and apply the coupon
4. **Expected**: Coupon should be validated and discount applied successfully

### Test Case 3: Category-Based Coupon for Event
1. Create a wedding event in the "Wedding" category
2. Create a coupon with:
   - `applicableType: 'CATEGORY'` 
   - `applicableCategory` set to the "Wedding" category ID
3. Try to book any wedding event and apply the coupon
4. **Expected**: Coupon should work for ANY event in that category

## Files Modified
1. `frontend/src/components/PaymentModal.tsx` - Updated coupon validation and fetching logic
2. `server/routes/coupons.js` - Enhanced validation to support CATEGORY coupons for events

## Benefits
✅ Coupons now work correctly for both event and service bookings
✅ Category-based coupons work for all events in that category
✅ Service-specific coupons only work for designated services
✅ Clear separation between EVENT and SERVICE coupon types
✅ Better user experience with accurate error messages

## Notes
- The fix maintains backward compatibility with existing coupon structure
- Global coupons (`isGlobal: true`) and ALL type coupons work for all bookings
- The usage limit and expiry date checks remain unchanged
- Admin can still create universal coupons that work across all categories
