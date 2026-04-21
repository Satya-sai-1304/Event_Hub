# Quick Visual Guide: Full-Service Event Workflow

## 🎯 Complete Workflow Diagram

```
┌─────────────┐
│   CUSTOMER  │
│ Books Event │
└──────┬──────┘
       │
       ▼
  ┌────────────┐
  │ pending_   │
  │   admin    │
  └──────┬─────┘
         │
         ▼
┌─────────────────┐
│     ADMIN       │
│ • View Details  │
│ • Approve       │
│ • Reject        │
└────────┬────────┘
         │ (Approve)
         ▼
  ┌──────────────┐
  │ pending_     │
  │  merchant    │
  └──────┬───────┘
         │
         ▼
┌─────────────────────┐
│     MERCHANT        │
│ • View Details      │
│ • Add Costs:        │
│   - Decoration      │
│   - Catering        │
│   - Music           │
│   - Lighting        │
│   - Other Charges   │
│ • Auto-calculate Tax│
│ • Add QR Code       │
│ • Send Bill         │
└────────┬────────────┘
         │ (Send Bill)
         ▼
  ┌─────────────┐
  │ bill_sent   │
  └──────┬──────┘
         │
         ▼
┌─────────────────────┐
│     CUSTOMER        │
│ • View Bill         │
│ • See Breakdown     │
│ • Scan QR Code      │
│ • Pay Now           │
└────────┬────────────┘
         │ (Pay)
         ▼
  ┌─────────────┐
  │    paid     │
  └─────────────┘
```

---

## 📊 Dashboard Views

### Admin Dashboard - Bookings Tab

```
┌─────────────────────────────────────────────────────────────┐
│ All Bookings                                                │
├─────────────────────────────────────────────────────────────┤
│ Event          │ Status        │ Actions                    │
├─────────────────────────────────────────────────────────────┤
│ Wedding Reception │ pending_admin │ [View] [Approve] [Reject]│
│ Birthday Party    │ pending_admin │ [View] [Approve] [Reject]│
│ Corporate Event   │ pending_merchant│ [View Details]          │
└─────────────────────────────────────────────────────────────┘
```

**Admin Click "View" → Modal Opens:**
```
┌──────────────────────────────────────────┐
│ Booking Details                          │
├──────────────────────────────────────────┤
│ 🎫 Event Information                     │
│ Title: Wedding Reception                 │
│ Customer: John Doe                       │
│ Email: john@example.com                  │
│ Date: April 15, 2026                     │
│ Time Slot: Night                         │
│ Guests: 200                              │
│ Status: pending_admin                    │
├──────────────────────────────────────────┤
│ ✨ Customer Requirements                 │
│ Decoration Theme: Romantic Elegance      │
│ [Image Preview]                          │
│ Food Type: Both Veg & Non-Veg           │
│ Music Option: DJ + Live Band            │
│ Additional Notes: Wheelchair access     │
└──────────────────────────────────────────┘
```

---

### Merchant Dashboard - Bookings Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Assigned Bookings                                           │
├─────────────────────────────────────────────────────────────┤
│ Event          │ Status           │ Actions                 │
├─────────────────────────────────────────────────────────────┤
│ Wedding Reception │ pending_merchant│ [View Details]         │
│                   │                │ [Complete & Send Bill]  │
└─────────────────────────────────────────────────────────────┘
```

**Merchant Click "Complete & Send Bill" → Billing Form Opens:**
```
┌──────────────────────────────────────────────┐
│ Add Costs & Generate Bill                    │
├──────────────────────────────────────────────┤
│ Decoration Cost (₹):    [10,000]             │
│ Catering Cost (₹):      [25,000]             │
│ Music Cost (₹):         [8,000]              │
│ Lighting Cost (₹):      [5,000]              │
│ Other Charges (₹):      [2,000]              │
├──────────────────────────────────────────────┤
│ Live Calculation:                            │
│ ┌─────────────────────────────────────────┐ │
│ │ Subtotal: ₹50,000                       │ │
│ │ GST (18%): ₹9,000                       │ │
│ │ Total Bill Amount: ₹59,000              │ │
│ └─────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ Payment QR Code (URL):                       │
│ [https://example.com/qr.png]                 │
│ [QR Preview Image]                           │
├──────────────────────────────────────────────┤
│ [Send Bill to Customer]                      │
└──────────────────────────────────────────────┘
```

---

### Customer Dashboard - My Bookings Tab

```
┌─────────────────────────────────────────────────────────────┐
│ My Bookings                                                 │
├─────────────────────────────────────────────────────────────┤
│ Event          │ Status      │ Actions                      │
├─────────────────────────────────────────────────────────────┤
│ Wedding Reception │ bill_sent  │ [View Bill] [Pay Now]        │
│ Concert Tickets    │ paid       │ [View Details]               │
└─────────────────────────────────────────────────────────────┘
```

**Customer Click "Pay Now" → Payment Modal Opens:**
```
┌──────────────────────────────────────────────┐
│ Complete Your Payment                        │
├──────────────────────────────────────────────┤
│ 📋 Bill Details                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Decoration Cost: ₹10,000                │ │
│ │ Catering Cost: ₹25,000                  │ │
│ │ Music Cost: ₹8,000                      │ │
│ │ Lighting Cost: ₹5,000                   │ │
│ │ Other Charges: ₹2,000                   │ │
│ │ Subtotal: ₹50,000                       │ │
│ │ GST (18%): ₹9,000                       │ │
│ │ Total Amount: ₹59,000                   │ │
│ └─────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ 💳 Payment QR Code                           │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │         [QR Code Image]                 │ │
│ │                                         │ │
│ │     Scan with your UPI App              │ │
│ └─────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ [I have Paid]                                │
└──────────────────────────────────────────────┘
```

---

## 🎨 Status Badge Colors

| Status | Color | Badge Style |
|--------|-------|-------------|
| `pending_admin` | Yellow | Outline |
| `pending_merchant` | Orange | Outline |
| `bill_sent` | Blue | Secondary |
| `paid` | Green | Default |
| `rejected` | Red | Destructive |

---

## 🔢 Auto-Calculation Formula

```
Subtotal = Decoration + Catering + Music + Lighting + Other
Tax (18%) = Subtotal × 0.18
Final Total = Subtotal + Tax
```

**Example:**
```
Decoration:    ₹15,000
Catering:      ₹40,000
Music:         ₹20,000
Lighting:      ₹8,000
Other:         ₹5,000
─────────────────────
Subtotal:      ₹88,000
GST (18%):     ₹15,840
─────────────────────
Final Total:   ₹1,03,840
```

---

## ✅ Button Actions Summary

### Admin Buttons:
- **View** → Opens detailed modal (read-only)
- **Approve** → Changes status: `pending_admin` → `pending_merchant`
- **Reject** → Changes status: `pending_admin` → `rejected`

### Merchant Buttons:
- **View Details** → Opens detailed modal (read-only)
- **Complete & Send Bill** → Opens billing form → Changes status: `pending_merchant` → `bill_sent`

### Customer Buttons:
- **View Bill** → Opens detailed modal (read-only)
- **Pay Now** → Opens payment modal → Changes status: `paid`

---

## 🔄 Comparison: Ticketed vs Full-Service

### Ticketed Events (Unchanged):
```
Book → pending → Merchant Accepts → accepted → Send Bill → billed → Pay → paid
```

### Full-Service Events (New):
```
Book → pending_admin → Admin Approves → pending_merchant → 
Merchant Adds Costs → bill_sent → Customer Pays → paid
```

---

## 📱 Mobile Responsive

All modals and forms are fully responsive:
- Desktop: Full-width tables and modals
- Tablet: Scrollable content
- Mobile: Stacked layout with touch-friendly buttons

---

**Ready to Test! 🚀**
