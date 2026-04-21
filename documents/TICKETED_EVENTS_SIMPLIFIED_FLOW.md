# Ticketed Events - Simplified Billing Flow

## Overview
For **ticketed events** (sports, concerts), the billing process has been simplified to skip unnecessary steps and directly provide QR code for payment.

---

## What Changed?

### 🎯 Key Differences Between Event Types

| Feature | **Ticketed Events** (Sports, Concerts) | **Full-Service Events** (Weddings, Birthdays) |
|---------|----------------------------------------|----------------------------------------------|
| **View Details** | ❌ Skipped - not shown | ✅ Shown - merchant can review details |
| **Billing Form** | ❌ No cost breakdown needed | ✅ Detailed itemized costs (decoration, catering, etc.) |
| **Additional Costs** | ❌ None - ticket price is final | ✅ Yes - multiple cost components |
| **QR Code** | ✅ Direct QR generation | ✅ QR after billing details |
| **Button Action** | "Send QR Code to Customer" | "Send Bill to Customer" |

---

## Implementation Details

### 1. **Merchant Actions Updated** (`BookingsPage.tsx`)

#### For Ticketed Events:
```typescript
// No "View Details" button shown
{getEventType(b) === 'full-service' && (
  <Button variant="outline">View Details</Button>
)}

// Direct QR code dialog opens
<Button onClick={() => {
  const eventType= getEventType(b);
  if (eventType === 'ticketed') {
    setBillDialog({ open: true, bookingId: b.id });
    // No billing details needed
  }
}}>
  Complete & Send Bill
</Button>
```

#### For Full-Service Events:
```typescript
// Shows "View Details" button
<Button variant="outline">View Details</Button>

// Opens billing form with pre-filled costs
<Button onClick={() => {
  if (eventType === 'full-service') {
    setBillDialog({ open: true, bookingId: b.id });
    // Pre-fill existing billing details
  }
}}>
  Complete & Send Bill
</Button>
```

---

### 2. **Billing Dialog Adapts to Event Type**

#### Ticketed Events Dialog:
```
┌─────────────────────────────────────┐
│ Generate Payment QR Code            │
├─────────────────────────────────────┤
│ Enter payment QR code URL for the   │
│ ticketed event. No additional       │
│ costs will be charged.              │
├─────────────────────────────────────┤
│ Payment QR Code (Image URL):        │
│ [https://example.com/qr.png]        │
│ [QR Preview Image]                  │
├─────────────────────────────────────┤
│ [Send QR Code to Customer]          │
└─────────────────────────────────────┘
```

#### Full-Service Events Dialog:
```
┌─────────────────────────────────────┐
│ Add Costs & Generate Bill           │
├─────────────────────────────────────┤
│ Enter itemized costs for the event. │
│ The system will calculate total     │
│ with 18% GST.                       │
├─────────────────────────────────────┤
│ Decoration Cost (₹): [10,000]       │
│ Catering Cost (₹):   [25,000]       │
│ Music Cost (₹):      [8,000]        │
│ Lighting Cost (₹):   [5,000]        │
│ Other Charges (₹):   [2,000]        │
├─────────────────────────────────────┤
│ Live Calculation:                   │
│ Subtotal: ₹50,000                   │
│ GST (18%): ₹9,000                   │
│ Total: ₹59,000                      │
├─────────────────────────────────────┤
│ Payment QR Code (URL): [...]        │
│ [QR Preview]                        │
├─────────────────────────────────────┤
│ [Send Bill to Customer]             │
└─────────────────────────────────────┘
```

---

### 3. **Backend Processing**

#### handleBillSubmit Function:
```typescript
const handleBillSubmit = (e: React.FormEvent, eventType: string = 'full-service') => {
  if (eventType === 'ticketed') {
    // Simple path - just QR code
    updateMutation.mutate({
      id: billDialog.bookingId,
      data: {
        status: "bill_sent",
        billQrCode: qrCodeLink,
        billingDetails: undefined // No billing details
      }
    });
  } else {
    // Full-service path - detailed billing
    updateMutation.mutate({
      id: billDialog.bookingId,
      data: {
        status: "bill_sent",
        billingDetails: {
          decorationCost,
          cateringCost,
          musicCost,
          lightingCost,
          additionalCharges,
          subtotal,
          tax,
          finalTotal
        },
        billQrCode: qrCodeLink
      }
    });
  }
};
```

---

## User Flow Comparison

### 🎫 Ticketed Event Flow (Sports/Concert)
```
Customer Books Ticket → Admin Approval → Merchant Assignment 
                                            ↓
                    ┌───────────────────────┘
                    ↓
         [No View Details Needed]
                    ↓
         Click "Complete & Send Bill"
                    ↓
         Enter QR Code URL Only
                    ↓
         Click "Send QR Code to Customer"
                    ↓
         Status: bill_sent
                    ↓
         Customer Sees: QR Code + Pay Now
```

### 💒 Full-Service Event Flow (Weddings/Birthdays)
```
Customer Request → Admin Approval → Merchant Assignment
                                      ↓
                               View Details (Optional)
                                      ↓
                            Click "Complete & Send Bill"
                                      ↓
                            Fill Itemized Costs Form
                            • Decoration
                            • Catering
                            • Music
                            • Lighting
                            • Other
                            • Auto-calculated GST
                                      ↓
                            Enter QR Code URL
                                      ↓
                            Click "Send Bill to Customer"
                                      ↓
                            Status: bill_sent
                                      ↓
                            Customer Sees: Detailed Bill + QR + Pay Now
```

---

## Benefits

### ✅ For Merchants:
- **Faster workflow** for ticketed events
- **No confusion** about which events need billing details
- **Clear separation** between event types
- **One-click QR generation** for sports/concerts

### ✅ For Customers:
- **Simpler experience** for ticket bookings
- **No unnecessary details** for simple events
- **Direct payment** via QR code
- **Transparency** maintained for full-service events

### ✅ For System:
- **Cleaner data** - no empty billing objects for ticketed events
- **Better performance** - skips unnecessary calculations
- **Flexible architecture** - easy to add more event-specific logic

---

## Testing Checklist

### ✅ Ticketed Events:
- [ ] Merchant doesn't see "View Details" button
- [ ] Clicking "Complete & Send Bill" opens simple QR dialog
- [ ] No cost input fields shown
- [ ] Button text says "Send QR Code to Customer"
- [ ] After submission, customer sees only QR code (no billing breakdown)

### ✅ Full-Service Events:
- [ ] Merchant sees "View Details" button
- [ ] Clicking "Complete & Send Bill" opens full billing form
- [ ] All cost input fields shown
- [ ] Live calculation works
- [ ] Button text says "Send Bill to Customer"
- [ ] After submission, customer sees detailed bill + QR

---

## Files Modified

1. **`frontend/src/pages/dashboard/BookingsPage.tsx`**
   - Updated `handleBillSubmit()` to accept `eventType` parameter
   - Added conditional rendering for "View Details" button
   - Modified billing dialog to show/hide fields based on event type
   - Dynamic button text based on event type

---

## Technical Notes

### Event Type Detection:
```typescript
const getEventType= (booking: Booking) => {
  const event = events.find(e => e.id === booking.eventId);
 return event?.eventType || 'full-service';
};
```

### Conditional Rendering:
```typescript
// Show cost inputs only for full-service
{billDialog.bookingId && getEventType(...) !== 'ticketed' && (
  <>...cost fields...</>
)}

// Always show QR input
<Input value={qrCodeLink} required />
```

---

## Future Enhancements

Potential improvements:
- Add default QR codes for recurring ticketed events
- Support partial payments for ticketed events
- Add analytics for ticketed vs full-service revenue
- Enable bulk QR generation for multiple ticket bookings

---

## Summary

✨ **Ticketed events now have a streamlined checkout flow:**
- Skip view details → Go straight to action
- Skip billing forms → Just QR code
- Faster completion → Happy merchants
- Simpler payments → Happy customers

🎯 **Full-service events maintain their detailed workflow** for proper cost tracking and transparency.
