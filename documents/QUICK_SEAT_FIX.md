# Quick Fix - Seat Selection Not Visible

## Problem
Seat selection grid is empty on booking page even though merchant configured seats.

## Root Cause
The `ticketType.totalSeats` and `ticketType.seatsPerRow` might be stored as **strings** in the database, but we're not converting them to numbers properly.

## Solution

### Change 1: Convert to Numbers (Line ~322-323)

**Current Code:**
```typescript
const totalRows = ticketType.totalSeats || 0;
const seatsPerRow = ticketType.seatsPerRow || 0;
```

**Fixed Code:**
```typescript
const totalRows = Number(ticketType.totalSeats) || 0;
const seatsPerRow = Number(ticketType.seatsPerRow) || 0;
```

### Change 2: Add Debug Console Logs (Optional)

Add before `generatedSeats` return:
```typescript
console.log('Generated seats count:', seats.length);
console.log('First few seats:', seats.slice(0, 3));
```

### Change 3: Add Warning When No Seats

Change line ~354 from:
```typescript
if (!seatsToUse || seatsToUse.length === 0) return {};
```

To:
```typescript
if (!seatsToUse || seatsToUse.length === 0) {
  console.warn('No seats available for event:', event.title);
  console.log('event.seats:', event?.seats?.length);
  console.log('generatedSeats:', generatedSeats?.length);
  console.log('ticketTypes:', event?.ticketTypes);
  return {};
}
```

---

## Testing Steps

1. Open browser console (F12)
2. Navigate to ticketed event booking page
3. Check console logs for:
   - "Generating seats from ticket types..."
   - "Generated seats count: X"
   - "Grouped seats by row: X rows"

4. If seats still don't show, check:
   - Are ticketTypes present in event data?
   - Do ticketTypes have `totalSeats` and `seatsPerRow` fields?
   - Are the values > 0?

---

## Expected Console Output

```
Generating seats from ticket types...
Ticket Types: [
  { name: "VIP", totalSeats: "1", seatsPerRow: "10", color: "#f59e0b" },
  { name: "Premium", totalSeats: "2", seatsPerRow: "10", color: "#8b5cf6" }
]
Generating 1 rows x 10 seats for VIP
Generating 2 rows x 10 seats for Premium
Generated seats count: 30
Total seats to use: 30
Grouped seats by row: 3 rows
```

---

## Alternative: Quick Test

If seats still don't show, temporarily add this hardcoded test:

Replace the `generatedSeats` useMemo with:

```typescript
const generatedSeats = useMemo(() => {
  // TEMPORARY TEST - Hardcoded seats
  const seats = [];
  for (let row = 0; row < 3; row++) {
    const rowLabel = String.fromCharCode(65 + row);
    for (let num = 1; num <= 10; num++) {
      seats.push({
        _id: `${rowLabel}${num}`,
        row: rowLabel,
        number: num,
        category: row === 0 ? 'VIP' : row === 1 ? 'Premium' : 'Regular',
        price: row === 0 ? 2000 : row === 1 ? 1000 : 500,
        color: row === 0 ? '#f59e0b' : row === 1 ? '#8b5cf6' : '#10b981',
        status: 'available',
        isBooked: false
      });
    }
  }
  console.log('HARDCODED TEST SEATS:', seats.length);
  return seats;
}, []);
```

If hardcoded seats show up → problem is with reading ticketTypes
If hardcoded seats also don't show → problem is elsewhere in rendering
