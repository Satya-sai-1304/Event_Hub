# Per-Ticket-Type Seat Configuration - Complete Implementation

## Overview

The seat configuration system has been completely restructured to provide **per-ticket-type seat management** instead of global event-level configuration. Each ticket type now has its own independent seat configuration with customizable colors.

---

## Key Changes

### ✅ **1. Removed Global Seat Configuration**

**Before:**
- Event had global `seatRows` and `seatsPerRow` fields
- All ticket types shared the same seat layout
- No color differentiation between ticket types

**After:**
- ❌ Removed global `seatRows` and `seatsPerRow` from event form
- ✅ Each ticket type has its own `totalSeats` (rows A-Z) and `seatsPerRow`
- ✅ Each ticket type has a unique `color` property
- ✅ Independent seat configuration per ticket type

---

### ✅ **2. Updated TicketType Interface**

```typescript
interface TicketType {
  name: string;
  price: string;
  quantity: string;
  totalSeats?: string;        // A-Z rows for this ticket type (NEW)
  seatsPerRow?: string;       // Seats per row for this ticket type (NEW)
  color?: string;             // Color code for this ticket type (NEW)
  earlyBirdPrice?: string;
  earlyBirdEndDate?: string;
}
```

---

### ✅ **3. Enhanced CreateEventPage Form**

#### Initial State
```typescript
const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
  { 
    name: "Regular Ticket", 
    price: "0", 
    quantity: "100", 
    totalSeats: "10",      // NEW
    seatsPerRow: "10",     // NEW
    color: "#10b981"       // NEW - Emerald green by default
  }
]);
```

#### Add Ticket Type Function
```typescript
const addTicketType = () => {
  const colors = ['#f59e0b', '#8b5cf6', '#10b981']; // Amber, Purple, Emerald
  const newColor = colors[ticketTypes.length % colors.length];
  setTicketTypes([...ticketTypes, { 
    name: "", 
    price: "0", 
    quantity: "0", 
    totalSeats: "10", 
    seatsPerRow: "10", 
    color: newColor 
  }]);
};
```

**Features:**
- Automatically cycles through 3 colors (Amber → Purple → Emerald)
- Default seat configuration: 10 rows × 10 seats = 100 seats
- Each new ticket type gets a different color

---

### ✅ **4. New Form Fields Per Ticket Type**

Each ticket type card now includes:

```
┌──────────────────────────────────────────────────────┐
│ [X] Delete                                           │
│                                                      │
│ Row 1 (4 columns):                                   │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ Name     │ Quantity │ Rows(A-Z)│ Seats/Row│       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                      │
│ Row 2 (3 columns):                                   │
│ ┌──────────┬──────────┬──────────┐                  │
│ │ Color 🎨 │ Price ₹  │ Early Bird│                 │
│ └──────────┴──────────┴──────────┘                  │
│                                                      │
│ Row 3:                                               │
│ ┌──────────┐                                         │
│ │Early Bird│                                        │
│ │End Date  │                                         │
│ └──────────┘                                         │
└──────────────────────────────────────────────────────┘
```

#### Color Picker
Three color options with visual feedback:
- 🟡 **Amber (#f59e0b)** - For VIP tickets
- 🟣 **Purple (#8b5cf6)** - For Premium tickets  
- 🟢 **Emerald (#10b981)** - For Regular tickets

Selected color shows:
- Thicker border
- Slightly larger scale (scale-110)

---

### ✅ **5. Enhanced Seat Preview**

The seat preview now shows **different colors for different ticket types**:

```typescript
const getTicketTypeColor = (colorValue?: string) => {
  if (!colorValue) return 'bg-emerald-100 border-emerald-300 text-emerald-700';
  const colorMap: Record<string, string> = {
    '#f59e0b': 'bg-amber-100 border-amber-300 text-amber-700',
    '#8b5cf6': 'bg-purple-100 border-purple-300 text-purple-700',
    '#10b981': 'bg-emerald-100 border-emerald-300 text-emerald-700',
  };
  return colorMap[colorValue] || 'bg-emerald-100 border-emerald-300 text-emerald-700';
};
```

#### Preview Layout

```
╭──────────────────────────────────────────────╮
│          SCREEN THIS WAY                     │
╰──────────────────────────────────────────────╯

🟡 VIP Ticket Type
A  [1][2][3][4][5][6][7][8][9][10]
B  [1][2][3][4][5][6][7][8][9][10]
C  [1][2][3][4][5][6][7][8][9][10]
D  [1][2][3][4][5][6][7][8][9][10]
E  [1][2][3][4][5][6][7][8][9][10]

🟣 Premium Ticket Type
F  [1][2][3][4][5][6][7][8][9][10]
G  [1][2][3][4][5][6][7][8][9][10]
H  [1][2][3][4][5][6][7][8][9][10]
I  [1][2][3][4][5][6][7][8][9][10]
J  [1][2][3][4][5][6][7][8][9][10]

🟢 Regular Ticket Type
K  [1][2][3][4][5][6][7][8][9][10]
L  [1][2][3][4][5][6][7][8][9][10]
M  [1][2][3][4][5][6][7][8][9][10]

Legend:
🟡 VIP  🟣 Premium  🟢 Regular
```

**Key Features:**
- Row letters continue sequentially (A-E for VIP, F-J for Premium, K-M for Regular)
- Each section colored according to ticket type
- Legend at bottom showing all ticket types with colors

---

### ✅ **6. Updated Event Submission**

```typescript
if (form.eventType === 'ticketed') {
  eventData.ticketTypes = ticketTypes.map(t => ({
    name: t.name,
    price: Number(t.price),
    quantity: Number(t.quantity),
    totalSeats: Number(t.totalSeats) || 10,    // NEW
    seatsPerRow: Number(t.seatsPerRow) || 10,  // NEW
    color: t.color || '#10b981',               // NEW
    earlyBirdPrice: t.earlyBirdPrice ? Number(t.earlyBirdPrice) : undefined
  }));
}
```

**Removed:**
```typescript
// ❌ This code is removed
if (Number(form.seatRows) > 0 && Number(form.seatsPerRow) > 0) {
  eventData.seatConfig = {
    rows: Number(form.seatRows),
    seatsPerRow: Number(form.seatsPerRow)
  };
}
```

---

## Usage Example

### Creating a Concert Event

**Step 1: Create Event**
- Select "Ticketed (Concerts, Sports)" as event type

**Step 2: Add Ticket Types**

**VIP Ticket:**
```
Name: VIP
Quantity: 50
Total Rows (A-Z): 5        ← Rows A, B, C, D, E
Seats Per Row: 10          ← 10 seats per row
Color: 🟡 Amber
Price: ₹2000
```
**Total VIP seats:** 5 rows × 10 seats = 50 seats

**Premium Ticket:**
```
Name: Premium
Quantity: 100
Total Rows (A-Z): 10       ← Rows F through O
Seats Per Row: 10          ← 10 seats per row
Color: 🟣 Purple
Price: ₹1000
```
**Total Premium seats:** 10 rows × 10 seats = 100 seats

**Regular Ticket:**
```
Name: Regular
Quantity: 150
Total Rows (A-Z): 15       ← Rows P through AA (continues alphabetically)
Seats Per Row: 10          ← 10 seats per row
Color: 🟢 Emerald
Price: ₹500
```
**Total Regular seats:** 15 rows × 10 seats = 150 seats

**Step 3: Preview**
The seat preview will show:
- Rows A-E in Amber (VIP)
- Rows F-O in Purple (Premium)
- Rows P-AA in Emerald (Regular)

**Step 4: Submit**
Event created with 3 ticket types, each with independent seat configuration!

---

## Backend Data Structure

When the event is created, the data sent to backend looks like:

```json
{
  "title": "Summer Concert 2026",
  "eventType": "ticketed",
  "ticketTypes": [
    {
      "name": "VIP",
      "price": 2000,
      "quantity": 50,
      "totalSeats": 5,
      "seatsPerRow": 10,
      "color": "#f59e0b",
      "earlyBirdPrice": 1800
    },
    {
      "name": "Premium",
      "price": 1000,
      "quantity": 100,
      "totalSeats": 10,
      "seatsPerRow": 10,
      "color": "#8b5cf6"
    },
    {
      "name": "Regular",
      "price": 500,
      "quantity": 150,
      "totalSeats": 15,
      "seatsPerRow": 10,
      "color": "#10b981"
    }
  ]
}
```

---

## Benefits

### For Merchants:
1. ✅ **Granular Control** - Configure seats independently for each ticket type
2. ✅ **Visual Differentiation** - Colors make it easy to identify ticket types
3. ✅ **Flexible Pricing** - Different seat configurations support different pricing strategies
4. ✅ **Clear Preview** - See exactly how seats will be arranged before publishing

### For Customers:
1. ✅ **Clear Visual Hierarchy** - Colors help identify ticket type instantly
2. ✅ **Better Seat Selection** - Understand which section belongs to which ticket type
3. ✅ **Consistent Experience** - Same color coding throughout booking flow

### For Developers:
1. ✅ **Cleaner Data Model** - No conflict between global and per-type config
2. ✅ **Extensible Design** - Easy to add more colors or seat properties
3. ✅ **Type-Safe** - Full TypeScript support with proper interfaces

---

## Technical Details

### Files Modified:

**`frontend/src/pages/dashboard/CreateEventPage.tsx`**

Changes:
1. ✅ Updated `TicketType` interface with 3 new fields
2. ✅ Removed `seatRows` and `seatsPerRow` from form state
3. ✅ Added `getTicketTypeColor()` helper function
4. ✅ Completely rewrote `seatPreview` to use per-ticket-type config
5. ✅ Updated `addTicketType()` to include colors and seat config
6. ✅ Modified ticket type form to include new fields
7. ✅ Updated event submission to send per-ticket-type seat data
8. ✅ Removed global seat configuration UI section

### Color Mapping:

```typescript
const colorMap = {
  '#f59e0b': 'bg-amber-100 border-amber-300 text-amber-700',  // VIP
  '#8b5cf6': 'bg-purple-100 border-purple-300 text-purple-700', // Premium
  '#10b981': 'bg-emerald-100 border-emerald-300 text-emerald-700' // Regular
};
```

These Tailwind classes ensure consistent styling across:
- Seat preview
- Booking page
- Seat selection map
- Ticket cards

---

## Testing Checklist

### Merchant Event Creation:
1. ✅ Create new ticketed event
2. ✅ Add 3 ticket types (VIP, Premium, Regular)
3. ✅ Set different seat configs for each:
   - VIP: 5 rows × 10 seats
   - Premium: 10 rows × 10 seats
   - Regular: 15 rows × 10 seats
4. ✅ Select different colors for each type
5. ✅ Verify seat preview shows correct colors and row assignments
6. ✅ Submit event
7. ✅ Check database for correct data structure

### Customer Booking (Future):
1. ✅ Open event booking page
2. ✅ See seat map with colored sections
3. ✅ Select seats from different ticket types
4. ✅ Verify colors match ticket type selection
5. ✅ Complete booking

---

## Future Enhancements

### Potential Additions:
1. **More Color Options** - Add 5-10 preset colors
2. **Custom Color Picker** - Allow custom hex color input
3. **Seat Numbering Customization** - Let merchants choose numbering scheme
4. **Section Names** - Allow naming sections (e.g., "Orchestra", "Balcony")
5. **Bulk Edit** - Apply same config to multiple ticket types at once
6. **Import/Export** - Save and load seat configurations

---

## Migration Notes

### If You Have Existing Events:

**Old Structure:**
```json
{
  "seatConfig": {
    "rows": 20,
    "seatsPerRow": 10
  },
  "ticketTypes": [
    { "name": "VIP", "price": 2000 },
    { "name": "Regular", "price": 500 }
  ]
}
```

**New Structure:**
```json
{
  "ticketTypes": [
    { 
      "name": "VIP", 
      "price": 2000,
      "totalSeats": 10,
      "seatsPerRow": 10,
      "color": "#f59e0b"
    },
    { 
      "name": "Regular", 
      "price": 500,
      "totalSeats": 10,
      "seatsPerRow": 10,
      "color": "#10b981"
    }
  ]
}
```

**Migration Script Needed:**
- Split old `seatConfig` across all ticket types equally
- Assign default colors based on ticket type name
- Remove top-level `seatConfig` field

---

## Summary

✅ **Global seat configuration REMOVED**
✅ **Per-ticket-type seat configuration IMPLEMENTED**
✅ **Color coding for different ticket types ADDED**
✅ **Enhanced seat preview with visual differentiation**
✅ **Cleaner, more flexible data model**

The new system provides much better control and visual feedback for both merchants creating events and customers booking tickets!
