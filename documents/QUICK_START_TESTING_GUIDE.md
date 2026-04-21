# Quick Start Guide - Enhanced Full-Service Booking

## 🎯 How to Test the New Features

### Prerequisites
Make sure your server is running:
```bash
cd server
node index.js
```

And frontend:
```bash
cd frontend
npm run dev
```

---

## Step-by-Step Testing Workflow

### Step 1: Create a Full-Service Event (As Organizer)

1. Login as organizer (merchant)
2. Navigate to "Create Event"
3. Fill in event details:
   - Title: "Grand Wedding Celebration"
   - Category: Wedding
   - Price: ₹50,000 (base package)
   - **Event Type: Select"full-service"**
4. Add some decoration themes (optional - can be done via API for now):
   ```javascript
   // Example decoration theme structure
   {
     name: "Romantic Elegance",
     image: "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=400&q=80",
     description: "Beautiful romantic setup with flowers and soft lighting"
   }
   ```

---

### Step 2: Book the Event (As Customer)

1. Login as customer
2. Browse events and click on your full-service event
3. Click "Request Full-Service Event"
4. Fill in the enhanced form:
   - **Event Date:** Pick a date
   - **Number of Guests:** e.g., 150
   - **Time Slot:** Select "Day Time" or "Night Time"
   - **Decoration Theme:** Select from dropdown
     - *Notice the image preview appears!*
   - **Food Type:** Select preference
   - **Music Option:** Select preference
   - **Additional Notes:**Add any special requests
5. Click "Submit Request for Approval"
6. Verify booking appears in "My Bookings" with status `pending_admin`

---

### Step 3: Admin Approval

1. Login as admin (admin@gmail.com/ admin@123)
2. Go to Admin Dashboard → "Bookings" tab
3. Find your booking and click "View"
4. Review all customer requirements:
   - Customer info
   - Event details
   - Decoration theme with image
   - Food type
   - Music option
   - Additional notes
5. Click **"Approve & Send to Merchant"**
   - Or click "Reject" to test rejection flow
6. Verify status changes to `pending_merchant`

---

### Step 4: Merchant Billing (As Organizer)

1. Login as the organizer who created the event
2. Go to Organizer Dashboard → "Bookings" tab
3. Find booking with status `pending_merchant`
4. Click the billing button (should appear for pending merchant bookings)
5. Fill in itemized costs:
   - **Decoration Cost:** ₹10,000
   - **Catering Cost:** ₹25,000
   - **Music Cost:** ₹8,000
   - **Lighting Cost:** ₹5,000
   - **Additional Charges:** ₹2,000
6. Watch auto-calculation:
   - Subtotal: ₹50,000
   - Tax (18%): ₹9,000
   - **Final Total: ₹59,000**
7. Add QR Code URL:
   - Use a placeholder: `https://example.com/qr-payment.png`
   - Or use a real UPI QR code image URL
8. Click "Generate Bill & Notify Customer"
9. Verify status changes to `bill_sent`

---

### Step 5: Customer Payment (As Customer)

1. Login as the customer who booked
2. Go to "My Bookings"
3. Find booking with status `bill_sent`
4. Click "Pay Now" or "View Details"
5. In the modal, see:
   - Complete bill breakdown
   - Each cost item listed
   - Subtotal, tax, and final total
   - QR code for payment
6. Click **"Confirm Payment"**
7. Verify status changes to `paid`
8. Booking is now complete!

---

## 🎨 Visual Elements to Notice

### Decoration Theme Preview
When customer selects a decoration theme, an image appears showing what that theme looks like. This makes the platform look professional and helps customers visualize their event.

### Itemized Bill Display
Customers see a clear breakdown:
```
Base Package Price:        ₹50,000
Decoration:                ₹10,000
Catering:                  ₹25,000
Music:                     ₹8,000
Lighting:                  ₹5,000
Additional Charges:        ₹2,000
Subtotal:                  ₹50,000
Tax (18% GST):             ₹9,000
--------------------------------
FINAL TOTAL:               ₹1,09,000
```

---

## 🧪 Test Cases to Verify

### ✅ Happy Path
1. Customer books with all fields filled
2. Admin approves
3. Merchant adds costs and sends bill
4. Customer pays
5. Status becomes `paid`

### ⚠️ Edge Cases
1. **Empty decoration themes:** Dropdown shows default options
2. **Zero costs:** Merchant can enter 0 for any field
3. **No QR code:**Form validation requires QR code URL
4. **Rejection flow:**Admin rejects → customer notified

### 🔄 Regression Testing
1. **Ticketed events still work:**
   - Book a ticketed event (concert, sports)
   - Verify simple guest-count-only flow unchanged
   - Verify no decoration/food/music options appear
   
2. **Existing bookings unaffected:**
   - Old bookings should still display correctly
   - New fields are optional/undefined for old data

---

## 📊 Sample Data for Testing

### Decoration Themes (for reference)
```json
[
  {
    "name": "Romantic Elegance",
    "image": "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=400&q=80",
    "description": "Soft pastels, floral arrangements, and candlelight"
  },
  {
    "name": "Modern Minimalist",
    "image": "https://images.unsplash.com/photo-1515934751635-c81c6bc0d168?w=400&q=80",
    "description": "Clean lines, monochrome palette, contemporary design"
  },
  {
    "name": "Traditional Royal",
    "image": "https://images.unsplash.com/photo-1546193430-c2d207739ed7?w=400&q=80",
    "description": "Rich colors, ornate decorations, cultural elements"
  },
  {
    "name": "Rustic Charm",
    "image": "https://images.unsplash.com/photo-1469334031218-e38a152b7e18?w=400&q=80",
    "description": "Wooden elements, burlap, wildflowers, vintage touches"
  },
  {
    "name": "Luxury Glam",
    "image": "https://images.unsplash.com/photo-1507914372368-b2b085b925a1?w=400&q=80",
    "description": "Gold accents, crystal, premium fabrics, opulent setting"
  }
]
```

### Sample Customer Requirements
- **Event Date:** April 15, 2026
- **Time Slot:** Night Time (6 PM - 11 PM)
- **Guests:** 200
- **Decoration:** Romantic Elegance
- **Food:** Both Veg & Non-Veg
- **Music:** DJ + Live Band
- **Notes:** "Need wheelchair accessibility"

### Sample Merchant Costs
- Base Package: ₹50,000
- Decoration: ₹15,000
- Catering (200 guests): ₹40,000
- Music (DJ + Band): ₹20,000
- Lighting: ₹8,000
- Additional: ₹5,000 (AC charges)
- **Subtotal:** ₹88,000
- **Tax (18%):** ₹17,640
- **Final Total:** ₹1,05,640

---

## 🐛 Troubleshooting

### Issue: Decoration dropdown empty
**Solution:** No decoration themes added yet. System shows default options.

### Issue: Bill not calculating
**Solution:** Ensure at least one cost field has a value. Auto-calculation triggers on input change.

### Issue: Can't find "Pay Now" button
**Solution:** Only appears when status is exactly `bill_sent`. Check booking status.

### Issue: TypeScript errors
**Solution:** Run `npm install` in frontend folder to ensure types are up to date.

---

## 📱 Mobile Responsiveness

Test on different screen sizes:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

All forms and modals should be responsive and usable.

---

## ✨ What Makes This Attractive

1. **Visual Decoration Selection** - Like WeddingWire
2. **Professional Billing** - Itemized breakdown builds trust
3. **Clear Workflow** - Everyone knows what stage they're at
4. **QR Payment** - Modern, convenient payment method
5. **Transparent Pricing** - No hidden surprises

---

**Happy Testing! 🎉**

For questions or issues, refer to IMPLEMENTATION_SUMMARY_ENHANCED_BOOKING.md
