# 🎫 Ticketed Event Creation - Visual Guide

## For Merchants: Creating Ticket Types with Seat Configuration

### Step 1: Select Event Type
When creating a new event, select **"Ticketed (Concerts, Sports)"** as the event type.

```
Event Type Dropdown:
┌────────────────────────────────────────────┐
│ Full Service (Weddings, Birthdays)         │
│ Ticketed (Concerts, Sports) ← SELECT THIS  │
└────────────────────────────────────────────┘
```

### Step 2: Configure Seat Layout
Scroll down to the **Seat Configuration** section and enter:
- **Number of Rows (A-Z):** How many lettered rows (max 26 for A-Z)
- **Seats Per Row:** How many numbered seats in each row

```
Seat Configuration:
┌─────────────────────────────────────────────┐
│ Number of Rows (A-Z): [ 10 ]                │
│ Seats Per Row: [ 15 ]                       │
└─────────────────────────────────────────────┘

Preview:
     ╭──────────────────────╮
     │   SCREEN THIS WAY    │
     ╰──────────────────────╯
     
A  [1][2][3][4][5][6][7][8][9][10]...[15]
B  [1][2][3][4][5][6][7][8][9][10]...[15]
C  [1][2][3][4][5][6][7][8][9][10]...[15]
...
J  [1][2][3][4][5][6][7][8][9][10]...[15]

Total Seats: 150
```

### Step 3: Add Ticket Types
For EACH ticket type, you must now specify:
1. **Ticket Name** (e.g., VIP, Premium, Regular)
2. **Quantity** (total tickets available)
3. **Total Seats (A-Z Rows)** ← NEW FIELD! ⭐
4. **Price** (₹)
5. **Early Bird Price** (optional)

```
Ticket Types Section:
┌──────────────────────────────────────────────────────┐
│ Ticket Types                    [+ Add Ticket Type]  │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐   │
│ │ [X] Delete                                     │   │
│ │                                                │   │
│ │ Ticket Name: [VIP           ]                  │   │
│ │ Quantity:    [50          ]                    │   │
│ │ Total Seats: [5           ] ← NEW!             │   │
│ │   (This means rows A-E for VIP)                │   │
│ │ Price:       [1500        ]                    │   │
│ │ Early Bird:  [1200        ] (optional)         │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ [X] Delete                                     │   │
│ │                                                │   │
│ │ Ticket Name: [Premium       ]                  │   │
│ │ Quantity:    [100         ]                    │   │
│ │ Total Seats: [10          ] ← NEW!             │   │
│ │   (This means rows F-O for Premium)            │   │
│ │ Price:       [800         ]                    │   │
│ │ Early Bird:  [650         ] (optional)         │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ [X] Delete                                     │   │
│ │                                                │   │
│ │ Ticket Name: [Regular       ]                  │   │
│ │ Quantity:    [200         ]                    │   │
│ │ Total Seats: [15          ] ← NEW!             │   │
│ │   (This means rows P-AA for Regular)           │   │
│ │ Price:       [500         ]                    │   │
│ │ Early Bird:  [400         ] (optional)         │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Step 4: Understanding Total Seats (A-Z Rows)

The **Total Seats** field tells the system how many rows to allocate for that ticket type.

Example Configuration:
```
VIP:      5 rows  → Rows A, B, C, D, E         (50 seats)
Premium:  10 rows → Rows F, G, H, I, J, K, L, M, N, O  (100 seats)
Regular:  15 rows → Rows P through AA          (200 seats)
```

The system will automatically:
- Generate seats based on your row + per-row configuration
- Assign ticket types to specific rows
- Color-code seats accordingly

### Color Coding System

Each ticket type gets automatic color coding:

```
🎫 VIP Tickets:
   Color: Amber/Gold 🟡
   Gradient: from-amber-300 via-amber-400 to-amber-500
   Icon: Crown 👑
   Badge: "★ VIP Access"

🎫 Premium Tickets:
   Color: Purple 🟣
   Gradient: from-purple-400 via-purple-500 to-purple-600
   Icon: Ticket 🎟️
   Badge: "✓ Premium"

🎫 Regular Tickets:
   Color: Emerald/Green 🟢
   Gradient: from-emerald-400 to-emerald-600
   Icon: Armchair 💺
   Badge: "○ General"
```

---

## For Customers: Booking Experience

### What You'll See

When booking a ticketed event, the page is divided into sections:

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEFT PANEL (Always Visible)              RIGHT PANEL               │
│ ┌──────────────────────────┐           ┌────────────────────────┐  │
│ │ Event Details            │           │   Seat Map             │  │
│ │ • Title & Image          │           │                        │  │
│ │ • Date & Location        │           │   Screen This Way ➡    │  │
│ │                          │           │                        │  │
│ │ ┌──────────────────────┐ │           │  A [1][2][3][4][5]... │  │
│ │ │ Choose Ticket Type   │ │           │  B [1][2][3][4][5]... │  │
│ │ │ ★ VIP Access         │ │           │  C [1][2][3][4][5]... │  │
│ │ │ ₹1500 | 50 left      │ │           │  ...                  │  │
│ │ │ [-] 0 [+]            │ │           │                        │  │
│ │ │                      │ │           │                        │  │
│ │ │ ✓ Premium            │ │           │ Legend:                │  │
│ │ │ ₹800 | 100 left      │ │           │ 🟡 VIP    🟣 Premium   │  │
│ │ │ [-] 2 [+]            │ │           │ 🟢 Regular ⚪ Booked    │  │
│ │ │                      │ │           │                        │  │
│ │ │ ○ General            │ │           │ Your Selection:        │  │
│ │ │ ₹500 | 200 left      │ │           │ • Row A Seat 1 (VIP)   │  │
│ │ │ [-] 1 [+]            │ │           │ • Row F Seat 5 (Prem)  │  │
│ │ └──────────────────────┘ │           │ Total: ₹2300           │  │
│ │                          │           └────────────────────────┘  │
│ │ Booking Summary          │                                        │
│ │ VIP × 1 = ₹1500         │                                        │
│ │ Premium × 2 = ₹1600     │                                        │
│ │ Fee: ₹49                │                                        │
│ │ ─────────────────────   │                                        │
│ │ Total: ₹3149            │                                        │
│ │ [Continue to Book]      │                                        │
│ └──────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features Fixed ✅

#### 1. "Choose Ticket Type" Always Visible
- Previously: Would disappear when selecting seats
- Now: Stays visible on the left panel at all times
- You can adjust ticket quantities even while viewing the seat map

#### 2. Accurate Ticket Count Display
- Shows exact count for each ticket type
- Updates in real-time as you select seats
- Properly handles zero values (doesn't show "undefined")

Example:
```
Before Fix:
  VIP: undefined ❌
  Premium: NaN ❌

After Fix:
  VIP: 2 ✅
  Premium: 0 ✅
```

#### 3. Automatic Color Changes
When you select seats, colors automatically match the ticket type:

```
Selecting a VIP seat:
  ┌─────┐
  │ A1  │ → Turns AMBER/GOLD with crown icon 👑
  └─────┘

Selecting a Premium seat:
  ┌─────┐
  │ F5  │ → Turns PURPLE with ticket icon 🎟️
  └─────┘

Selecting a Regular seat:
  ┌─────┐
  │ P3  │ → Turns GREEN/EMERALD with armchair icon 💺
  └─────┘
```

#### 4. Smart Button Behavior
- Decrement button disabled when count is 0
- Increment button disabled when sold out
- No more accidental negative quantities!

---

## Testing Scenarios

### Scenario 1: Merchant Creates Concert Event

1. Create event → Select "Ticketed"
2. Set capacity: 350
3. Seat config: 10 rows, 15 seats per row
4. Add ticket types:
   - **VIP**: 5 rows, 75 qty, ₹2000
   - **Premium**: 10 rows, 150 qty, ₹1000
   - **Regular**: 15 rows, 225 qty, ₹500
5. Submit → Event created ✅

### Scenario 2: Customer Books 3 VIP Tickets

1. Browse events → Select concert
2. See "Choose Ticket Type" card
3. Click "+" on VIP three times
4. Display shows: `VIP: 3` ✅
5. Colors: VIP card has amber gradient ✅
6. Summary: "VIP × 3 = ₹6000" ✅
7. Continue to payment ✅

### Scenario 3: Customer Selects Mixed Seats

1. Open ticketed event
2. Select seats from different rows:
   - A1 (VIP) → Amber color ✅
   - F5 (Premium) → Purple color ✅
   - P3 (Regular) → Green color ✅
3. Check "Choose Ticket Type":
   - VIP: 1 ✅
   - Premium: 1 ✅
   - Regular: 1 ✅
4. All counts accurate ✅
5. Card remains visible ✅

---

## Common Questions

**Q: What if I don't want to configure seats?**
A: Leave "Number of Rows" and "Seats Per Row" as 0. The event will use general admission without assigned seating.

**Q: Can I change total seats after creating the event?**
A: Currently no. Plan your seat configuration carefully before publishing.

**Q: What happens if I sell out one ticket type?**
A: That type will be marked "Sold Out" and customers can't select more tickets of that type.

**Q: Do colors update dynamically?**
A: Yes! As you select different seat types, the colors and icons update automatically.

---

## Troubleshooting

### Issue: "Choose Ticket Type" shows empty
**Solution:** Refresh the page. This should not happen after the fix.

### Issue: Ticket count shows undefined
**Solution:** Clear browser cache and reload. The fix includes null-safe handling.

### Issue: Colors not changing
**Solution:** Ensure ticket types are named correctly (VIP, Premium, Regular). The system uses name matching for color assignment.

### Issue: Can't decrement below 1
**Solution:** This is intentional. The button disables at 0 to prevent negative quantities.

---

## Summary

✅ Merchants can specify A-Z rows per ticket type
✅ "Choose Ticket Type" stays visible during booking
✅ Ticket counts display accurately
✅ Colors auto-update based on seat type
✅ Smart button behavior prevents errors

The ticketed event system is now fully functional! 🎉
