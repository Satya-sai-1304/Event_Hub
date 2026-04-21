# Quick Visual Guide: Admin Handover to Merchant

## 🎯 Complete Workflow Diagram

```
┌─────────────┐
│   CUSTOMER  │
│ Books Event │
└──────┬──────┘
       │
       ▼
  ┌─────────────┐
  │ pending_admin│
  └──────┬──────┘
         │
    ╔════╧════╗
    ║  ADMIN  ║
    ║ DECIDES ║
    ╚═══╤╤════╝
        ││
   ┌────┘└────┐
   │          │
   ▼          ▼
┌─────────┐ ┌──────────────┐
│  REJECT │ │ APPROVE &    │
│ ❌      │ │ SEND TO      │
│         │ │ MERCHANT ✅  │
└─────────┘ └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │pending_merchant│
            └──────────────┘
                   ▲
                   │
              ┌────┴─────┐
              │  ADMIN   │
              │  CAN     │
              │  ALSO    │
              │  HANDOVER│
              └────┬─────┘
                   │
                   ▼
         ┌──────────────────┐
         │handed_to_merchant│ ⭐ NEW
         └────────┬─────────┘
                  │
             ╔════╧════╗
             ║ MERCHANT║
             ║  ACTS   ║
             ╚════╤════╝
                  │
                  ▼
         ┌─────────────────┐
         │ Click "Complete │
         │  & Send Bill"   │
         └────────┬────────┘
                  │
                  ▼
            ┌──────────┐
            │ bill_sent│
            └────┬─────┘
                 │
            ╔════╧════╗
            ║CUSTOMER ║
            ║  PAYS   ║
            ╚════╤════╝
                 │
                 ▼
           ┌─────────┐
           │   paid  │
           └────┬────┘
                │
                ▼
          ┌──────────┐
          │ completed│
          └──────────┘
```

---

## 📋 Admin Dashboard Actions

### When Booking Status = `pending_admin`

```
┌──────────────────────────────────────────────────────┐
│  BOOKING DETAILS MODAL                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👤 Customer Information                             │
│     - Name, Email, Booking ID                        │
│                                                      │
│  📅 Event Information                                │
│     - Event Title, Date, Time Slot, Guests          │
│                                                      │
│  ✨ Customer Requirements                            │
│     - Decoration Theme (with image preview)          │
│     - Food Type                                      │
│     - Music Option                                   │
│     - Additional Notes                               │
│                                                      │
│  💰 Pricing Summary                                  │
│     - Base Package Price                             │
│     - (Additional costs will be added by merchant)   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ACTIONS:                                            │
│                                                      │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │ ❌ Reject│  │ 👥 Handover to  │  │ ✅ Approve │ │
│  │ (Red)    │  │   Merchant      │  │ & Send to  │ │
│  │          │  │   (Outline)     │  │ Merchant   │ │
│  │          │  │                 │  │ (Gradient) │ │
│  └──────────┘  └─────────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 🏪 Merchant Dashboard View

### Bookings Table

```
┌────────────────────────────────────────────────────────────────────┐
│  MY BOOKINGS                              [+ Create Event]         │
├────────────────────────────────────────────────────────────────────┤
│  Stats:                                                           │
│  ┌─────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────┐        │
│  │ My Events│Total Bookings│ Needs Billing │ Revenue  │        │
│  │   12   ││     8      ││   👉 3 👈    ││ ₹45,200 │        │
│  └─────────┘ └────────────┘ └──────────────┘ └──────────┘        │
├────────────────────────────────────────────────────────────────────┤
│  Customer        Event          Guests  Total    Status   Actions │
├────────────────────────────────────────────────────────────────────┤
│  John Doe       Wedding       150     ₹50,000  handed   [BUTTON] │
│  john@email.com Celebration                         to      ┌─────┐│
│                                                 merchant │Complete││
│                                                         │ & Send││
│                                                         │ Bill  ││
│                                                         └─────┘│
├────────────────────────────────────────────────────────────────────┤
│  Sarah Smith     Birthday      75      ₹25,000  pending  [BUTTON] │
│  sarah@email.com Party                                merchant ┌──┐│
│                                                             │Comp││
│                                                             │lete││
│                                                             │Send││
│                                                             └────┘│
├────────────────────────────────────────────────────────────────────┤
│  Mike Johnson    Corporate     200     ₹1,00,000 bill_sent       │
│  mike@email.com  Event                             Awaiting payment│
└────────────────────────────────────────────────────────────────────┘
```

---

## 💳 Merchant Billing Dialog

When merchant clicks **"Complete & Send Bill"**:

```
┌────────────────────────────────────────────────────────┐
│  COMPLETE EVENT & GENERATE BILL                    ✕  │
├────────────────────────────────────────────────────────┤
│  Enter itemized costs and payment QR code             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ITEMIZED COSTS                                       │
│  ┌──────────────────┐ ┌──────────────────┐           │
│  │ Decoration Cost  │ │ Catering Cost    │           │
│  │ [₹ 5,000____]    │ │ [₹ 10,000___]    │           │
│  └──────────────────┘ └──────────────────┘           │
│  ┌──────────────────┐ ┌──────────────────┐           │
│  │ Music Cost       │ │ Lighting Cost    │           │
│  │ [₹ 3,000____]    │ │ [₹ 2,000___]     │           │
│  └──────────────────┘ └──────────────────┘           │
│  ┌──────────────────────────────────────┐            │
│  │ Additional Charges                   │            │
│  │ [₹ 1,000_________]                   │            │
│  └──────────────────────────────────────┘            │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  TOTAL CALCULATION PREVIEW                     │  │
│  ├────────────────────────────────────────────────┤  │
│  │  Subtotal:              ₹ 21,000               │  │
│  │  Tax (18% GST):         ₹ 3,780                │  │
│  │  ──────────────────────────────────            │  │
│  │  Total Additional:      ₹ 24,780               │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  PAYMENT QR CODE                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Payment QR Code Image URL                      │  │
│  │ [https://example.com/qr-code.png__________]    │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  GENERATE BILL & NOTIFY CUSTOMER               │  │
│  │  (Primary Gradient Button)                     │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 📱 Customer View (After Merchant Sends Bill)

### Booking Details with Bill

```
┌────────────────────────────────────────────────────┐
│  BOOKING DETAILS                               ✕  │
├────────────────────────────────────────────────────┤
│                                                    │
│  📋 Wedding Celebration                            │
│  📅 March 15, 2026 | 👥 150 guests                │
│                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  💰 BILL BREAKDOWN                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                    │
│  Base Package Price           ₹ 50,000            │
│  + Decoration Cost            ₹ 5,000             │
│  + Catering Cost              ₹ 10,000            │
│  + Music Cost                 ₹ 3,000             │
│  + Lighting Cost              ₹ 2,000             │
│  + Additional Charges         ₹ 1,000             │
│  ─────────────────────────────────────────────    │
│  Subtotal                     ₹ 71,000            │
│  + Tax (18% GST)              ₹ 12,780            │
│  ─────────────────────────────────────────────    │
│  FINAL TOTAL                  ₹ 83,780            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                    │
│  SCAN TO PAY                                      │
│  ┌─────────────────────┐                          │
│  │                     │                          │
│  │    [QR CODE IMAGE]  │                          │
│  │                     │                          │
│  └─────────────────────┘                          │
│  Scan this QR code to complete your payment       │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │  ✅ I HAVE PAID                            │  │
│  │  (Green Success Button)                    │  │
│  └────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

---

## 🎯 Decision Tree for Admin

```
Booking Received (pending_admin)
         │
         ▼
    ┌─────────┐
    │ Review  │
    │ Booking │
    └────┬────┘
         │
         ▼
    ╔═══════════╗
    ║ Question: ║
    ║ Does this ║
    ║ need      │
    ║ merchant  │
    ║ full      │
    ║ control?  │
    ╚════╤══════╝
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ HANDOVER│ │ APPROVE &    │
│ TO      │ │ SEND TO      │
│ MERCHANT│ │ MERCHANT     │
└─────────┘ └──────────────┘
    │              │
    │              │
    ▼              ▼
Merchant takes   Merchant
full ownership  sends bill
    │              │
    ▼              ▼
Complete event   Customer
& send bill      pays
```

---

## 📊 Status Badge Colors

```
┌──────────────────────────────────────────────────┐
│ STATUS BADGE VISUAL GUIDE                       │
├──────────────────────────────────────────────────┤
│                                                  │
│  🟢 paid / completed    → Green (Success)       │
│  🟡 pending_admin       → Yellow (Waiting)      │
│  🟠 pending_merchant    → Orange (Processing)   │
│  🔵 handed_to_merchant  → Blue (Assigned)      │
│  🟣 bill_sent          → Purple (Billed)       │
│  🔴 rejected           → Red (Declined)        │
│  ⚪ other statuses      → Gray/Outline          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## ⏱️ Timeline Example

```
Day 1: Customer books wedding event
       ↓ (status: pending_admin)
       
Day 1: Admin reviews and hands over to merchant
       ↓ (status: handed_to_merchant)
       
Day 2: Merchant receives notification
       ↓ (merchant opens booking)
       
Day 2: Merchant fills billing details
       - Decoration: ₹10,000
       - Catering: ₹25,000
       - Music: ₹5,000
       - Lighting: ₹3,000
       - Total additional: ₹43,000+ 18% GST
       ↓ (status: bill_sent)
       
Day 2: Customer receives bill notification
       ↓ (customer views bill)
       
Day 2: Customer scans QR code and pays
       ↓ (status: paid)
       
Day 3: Event happens
       ↓ (status: completed)
```

---

## 🎨 Button Styles

### Admin Dashboard:

**Reject Button:**
```
┌──────────────────┐
│ ❌ Reject        │ ← Red background, white text
└──────────────────┘
```

**Handover to Merchant:**
```
┌──────────────────┐
│ 👥 Handover to   │ ← Transparent background,
│   Merchant       │   border, primary text
└──────────────────┘
```

**Approve & Send to Merchant:**
```
┌──────────────────┐
│ ✅ Approve &     │ ← Gradient background
│   Send to        │   (blue to purple),
│   Merchant       │   white text
└──────────────────┘
```

### Merchant Dashboard:

**Complete & Send Bill:**
```
┌──────────────────┐
│ ✨ Complete &    │ ← Gradient background
│   Send Bill      │   (blue to purple),
│                  │   white text
└──────────────────┘
```

---

## 🔔 Notification Examples

### Merchant Receives Handover Notification:

```
┌─────────────────────────────────────────────────┐
│ 🔔 NOTIFICATIONS                      (See All) │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🎯 Booking Handover Received                    │
│    A booking for "Wedding Celebration" has been │
│    handed over to you by the admin. Please     │
│    complete and send the bill.                  │
│                                    2 hours ago  │
│                                                 │
│ 💰 Payment Received!                            │
│    You have received payment for "Birthday     │
│    Party" from Sarah Johnson.                   │
│                                    1 day ago    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📈 Stats Card Display

```
┌─────────────────────────────────────────────────────────┐
│ ORGANIZER DASHBOARD                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ My Events    │ │ Total        │ │ Needs        │    │
│ │    12       │ │ Bookings     │ │ Billing      │    │
│ │  📅          │ │      8       │ │     3 👈    │    │
│ │              │ │  🎫          │ │  ⏰          │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Revenue                                          │  │
│ │    ₹45,200                                       │  │
│ │  💰                                              │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**"Needs Billing" includes:**
- Bookings with status`pending_merchant`: 2
- Bookings with status `handed_to_merchant`: 1
- **Total: 3**

---

This visual guide helps understand the complete flow at a glance!
