# 🎨 Decoration Themes & Enhanced Booking Workflow Implementation Guide

## ✅ Completed Features

### 1. Backend - Decoration Model
**File:** `server/models/Decoration.js`
- Created global decoration catalog managed by admin
- Fields: name, image, description, category, isActive
- Categories: wedding, birthday, corporate, party, all

### 2. Backend - Decorations API Routes  
**File:** `server/routes/decorations.js`
- GET /api/decorations - Fetch all active decorations
- POST /api/decorations - Create new decoration (admin only)
- PUT /api/decorations/:id - Update decoration
- DELETE /api/decorations/:id - Soft delete decoration

### 3. Frontend - Decorations Management Page
**File:** `frontend/src/pages/dashboard/DecorationsPage.tsx`
- Admin can view all decoration themes in grid layout
- Add/Edit/Delete decorations with image preview
- Category filtering and stats cards
- Image URL validation and preview

### 4. Frontend - Navigation Updated
**Files:** 
- `frontend/src/components/AppSidebar.tsx` - Added "Decorations" menu item for admin
- `frontend/src/App.tsx` - Added route `/dashboard/decorations`

---

## 📝 Remaining Implementation Steps

### Step 1: Update Customer Booking Form to Use Global Decorations

**File:** `frontend/src/components/BookingModal.tsx`

**Current State:** Uses event.decorationThemes array
**Required Change:** Fetch decorations from/api/decorations endpoint

```typescript
// Add this query inside BookingModal component
const { data: decorations = [] } = useQuery({
  queryKey: ['decorations'],
  queryFn: async () => {
   const response = await api.get('/decorations');
   return response.data;
  },
});

// Update the decoration theme dropdown to use global decorations
<Select value={selectedDecorationTheme} onValueChange={setSelectedDecorationTheme}>
  <SelectTrigger>
    <SelectValue placeholder="Select a decoration theme" />
  </SelectTrigger>
  <SelectContent>
    {decorations.map((theme: any) => (
      <SelectItem key={theme.id} value={theme.name}>
        {theme.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Update image preview to use global decoration image
{selectedDecorationTheme && (
  <div className="mt-3 p-3 rounded-lg border bg-muted">
    <img 
      src={decorations.find(d => d.name === selectedDecorationTheme)?.image || ''} 
     alt={selectedDecorationTheme}
      className="w-full h-32 object-cover rounded-md mb-2"
    />
    <p className="text-xs text-muted-foreground">
      {decorations.find(d => d.name === selectedDecorationTheme)?.description || ''}
    </p>
  </div>
)}
```

---

### Step 2: Enhance Admin Booking Detail Modal with View Button

**Already Implemented!** The AdminDashboard.tsx already has a detailed booking modal that shows:
- Customer information
- Event details
- Customer requirements with decoration image preview
- Food type, music option
- Additional notes
- Approve/Reject buttons

The booking detail modal is triggered when admin clicks "View" button in the bookings table.

---

### Step 3: Update Merchant Billing Form with Itemized Costs

**File:** `frontend/src/pages/dashboard/BookingsPage.tsx`

Replace the existing billing dialog with this enhanced version:

```typescript
// Update state at top of component
const [billingDetails, setBillingDetails] = useState({
  decorationCost: "",
  cateringCost: "",
  musicCost: "",
  lightingCost: "",
  otherCharges: "",
});

// Update handleBillSubmit function
const handleBillSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!billDialog.bookingId) return;
  
  // Calculate totals
 const decorationCost = Number(billingDetails.decorationCost) || 0;
 const cateringCost = Number(billingDetails.cateringCost) || 0;
 const musicCost = Number(billingDetails.musicCost) || 0;
 const lightingCost = Number(billingDetails.lightingCost) || 0;
 const otherCharges = Number(billingDetails.otherCharges) || 0;
  
 const subtotal = decorationCost + cateringCost + musicCost + lightingCost + otherCharges;
 const tax = subtotal * 0.18; // 18% GST
 const finalTotal = subtotal + tax;
  
  updateMutation.mutate({
    id: billDialog.bookingId,
    data: {
      status: "bill_sent",
      billingDetails: {
       decorationCost,
        cateringCost,
        musicCost,
        lightingCost,
        additionalCharges: otherCharges,
        subtotal,
        tax,
        finalTotal
      },
      billQrCode: qrCodeLink
    }
  });
  setBillDialog({ open: false, bookingId: null });
  setBillingDetails({
   decorationCost: "",
    cateringCost: "",
    musicCost: "",
    lightingCost: "",
    otherCharges: "",
  });
  setQrCodeLink("");
};

// Replace the billing Dialog JSX with enhanced form
<Dialog open={billDialog.open} onOpenChange={(open) => !open && setBillDialog({ open: false, bookingId: null })}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Add Costs & Generate Bill</DialogTitle>
      <DialogDescription>
        Enter itemized costs for the event. The system will calculate the total with 18% GST.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleBillSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="decorationCost">Decoration Cost (₹)</Label>
          <Input 
            id="decorationCost" 
            type="number" 
            min="0" 
            placeholder="0"
          value={billingDetails.decorationCost} 
          onChange={(e) => setBillingDetails({...billingDetails, decorationCost: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cateringCost">Catering Cost (₹)</Label>
          <Input 
            id="cateringCost" 
            type="number" 
            min="0" 
            placeholder="0"
          value={billingDetails.cateringCost} 
          onChange={(e) => setBillingDetails({...billingDetails, cateringCost: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="musicCost">Music Cost (₹)</Label>
          <Input 
            id="musicCost" 
            type="number" 
            min="0" 
            placeholder="0"
          value={billingDetails.musicCost} 
          onChange={(e) => setBillingDetails({...billingDetails, musicCost: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lightingCost">Lighting Cost (₹)</Label>
          <Input 
            id="lightingCost" 
            type="number" 
            min="0" 
            placeholder="0"
          value={billingDetails.lightingCost} 
          onChange={(e) => setBillingDetails({...billingDetails, lightingCost: e.target.value})} 
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="otherCharges">Other Charges (₹)</Label>
        <Input 
          id="otherCharges" 
          type="number" 
          min="0" 
          placeholder="0"
        value={billingDetails.otherCharges} 
        onChange={(e) => setBillingDetails({...billingDetails, otherCharges: e.target.value})} 
        />
      </div>
      
      {/* Live Total Calculation Display */}
      {(() => {
      const dec = Number(billingDetails.decorationCost) || 0;
      const cat = Number(billingDetails.cateringCost) || 0;
      const mus = Number(billingDetails.musicCost) || 0;
      const lit = Number(billingDetails.lightingCost) || 0;
      const oth = Number(billingDetails.otherCharges) || 0;
      const subtotal = dec + cat + mus + lit + oth;
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
        
      return subtotal > 0 ? (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST (18%):</span>
              <span className="font-medium">₹{tax.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-blue-300 pt-2">
              <span>Total Bill Amount:</span>
              <span className="text-primary">₹{total.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>
        ) : null;
      })()}
      
      <div className="space-y-2">
        <Label htmlFor="qrCodeLink">Payment QR Code (Image URL)</Label>
        <Input 
          id="qrCodeLink" 
          type="url" 
          placeholder="https://example.com/qr.png"
        value={qrCodeLink} 
        onChange={(e) => setQrCodeLink(e.target.value)} 
        required
        />
        {qrCodeLink && (
          <div className="mt-2 p-2 border rounded-md">
            <img src={qrCodeLink} alt="QR Preview" className="w-32 h-32 object-cover mx-auto" />
          </div>
        )}
      </div>
      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Sending Bill..." : "Send Bill to Customer"}
      </Button>
    </form>
  </DialogContent>
</Dialog>
```

---

### Step 4: Add View Details Dialog for All Users

Add this dialog after the billing dialog in `BookingsPage.tsx`:

```typescript
// Add state for view dialog
const [viewDialog, setViewDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });

// Add import for Eye icon
import { Eye } from "lucide-react";

// Add View button in the actions column for each row
<Button
  size="sm"
  variant="outline"
  onClick={() => setViewDialog({ open: true, booking: b })}
  className="mr-2"
>
  <Eye className="h-3 w-3 mr-1" /> View
</Button>

// Add the View Dialog JSX before closing div
<Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ open: false, booking: null })}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Booking Details</DialogTitle>
      <DialogDescription>Complete information about this booking</DialogDescription>
    </DialogHeader>
    {viewDialog.booking && (
      <div className="space-y-6 pt-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Event Information
          </h3>
          <div className="p-4 rounded-lg bg-muted">
            <p className="font-semibold mb-2">{viewDialog.booking.eventTitle}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">{viewDialog.booking.customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{viewDialog.booking.customerEmail}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Event Date:</span>
                <p className="font-medium">{new Date(viewDialog.booking.eventDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time Slot:</span>
                <p className="font-medium capitalize">{viewDialog.booking.timeSlot || viewDialog.booking.customerRequirements?.timeSlot || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guests:</span>
                <p className="font-medium">{viewDialog.booking.guests}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary" className="ml-2">{viewDialog.booking.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Requirements */}
        {viewDialog.booking.customerRequirements && Object.keys(viewDialog.booking.customerRequirements).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Customer Requirements
            </h3>
            <div className="space-y-4">
              {viewDialog.booking.customerRequirements.decorationTheme && (
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-2">Decoration Theme</p>
                  <p className="font-medium mb-3">{viewDialog.booking.customerRequirements.decorationTheme}</p>
                  {viewDialog.booking.customerRequirements.decorationThemeImage && (
                    <img 
                      src={viewDialog.booking.customerRequirements.decorationThemeImage} 
                    alt={viewDialog.booking.customerRequirements.decorationTheme}
                      className="w-full h-40 object-cover rounded-md"
                    />
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {viewDialog.booking.customerRequirements.foodType && (
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Food Type</p>
                    <p className="font-medium capitalize">{viewDialog.booking.customerRequirements.foodType}</p>
                  </div>
                )}
                {viewDialog.booking.customerRequirements.musicOption && (
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Music Option</p>
                    <p className="font-medium capitalize">{viewDialog.booking.customerRequirements.musicOption}</p>
                  </div>
                )}
              </div>
              
              {viewDialog.booking.customerRequirements.additionalNotes && (
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                  <p className="text-sm">{viewDialog.booking.customerRequirements.additionalNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Details */}
        {viewDialog.booking.billingDetails && viewDialog.booking.billingDetails.finalTotal && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Billing Details
            </h3>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
              {viewDialog.booking.billingDetails.decorationCost > 0 && (
                <div className="flex justify-between">
                  <span>Decoration Cost:</span>
                  <span className="font-medium">₹{viewDialog.booking.billingDetails.decorationCost.toLocaleString()}</span>
                </div>
              )}
              {/* Repeat for cateringCost, musicCost, lightingCost, additionalCharges */}
              <div className="border-t border-blue-300 pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{viewDialog.booking.billingDetails.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span className="font-medium">₹{viewDialog.booking.billingDetails.tax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-primary">₹{viewDialog.booking.billingDetails.finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment QR Code */}
        {viewDialog.booking.billQrCode && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Payment QR Code
            </h3>
            <div className="flex justify-center p-4 border rounded-lg">
              <img src={viewDialog.booking.billQrCode} alt="Payment QR" className="w-48 h-48 object-cover" />
            </div>
          </div>
        )}
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

### Step 5: Update Customer MyBookings Page for Payment Flow

**File:** `frontend/src/pages/dashboard/MyBookingsPage.tsx`

The customer payment flow is already implemented! It shows:
- QR code for payment
- "I Have Paid" button
- Status updates to `paid`

No changes needed here as the feature already exists.

---

## 🔄 Final Workflow Summary

```
1. Customer Books Event
   ↓ Status: pending_admin
2. Admin Views Booking (Clicks "View")
   ↓ Sees: Customer info, event details, decoration image, food, music, notes
3. Admin Approves
   ↓ Status: pending_merchant
4. Merchant Receives Booking
   ↓ Clicks "Send Bill"
5. Merchant Adds Itemized Costs
   - Decoration Cost
   - Catering Cost
   - Music Cost
   - Lighting Cost
   - Other Charges
   ↓ System auto-calculates: Subtotal + 18% GST = Final Total
6. Merchant Adds QR Code & Sends Bill
   ↓ Status: bill_sent
7. Customer Views Bill
   ↓ Sees: Itemized costs, total amount, QR code
8. Customer Scans QR & Pays
   ↓ Clicks "I Have Paid"
   ↓ Status: paid
✅ Booking Completed
```

---

## 📊 Testing Checklist

### Admin Functions:
- [ ] Navigate to Decorations page
- [ ] Add new decoration with name, image, description, category
- [ ] Edit existing decoration
- [ ] Delete decoration
- [ ] View all bookings
- [ ] Click "View" on a booking
- [ ] See complete booking details including decoration image
- [ ] Approve booking → Status changes to `pending_merchant`

### Merchant Functions:
- [ ] View assigned bookings (`pending_merchant` status)
- [ ] Click "Send Bill"
- [ ] Enter itemized costs (decoration: 5000, catering: 10000, etc.)
- [ ] Verify auto-calculation of subtotal, GST, and final total
- [ ] Enter QR code URL
- [ ] Send bill → Status changes to `bill_sent`

### Customer Functions:
- [ ] Book full-service event
- [ ] Select decoration theme from dropdown
- [ ] See decoration image preview
- [ ] Fill in food type, music option, additional notes
- [ ] Submit booking → Status becomes `pending_admin`
- [ ] View booking in "My Bookings"
- [ ] See payment requested status
- [ ] View bill with itemized costs
- [ ] Scan QR code
- [ ] Click "I Have Paid" → Status becomes `paid`

---

## 🎨 Key UI Improvements

1. **Decoration Management**: Visual grid layout with image previews
2. **Admin Booking View**: Comprehensive modal showing all customer requirements
3. **Merchant Billing**: Professional itemized bill builder with live calculation
4. **Customer Payment**: Clear QR code display with itemized bill breakdown

---

## 🚀 Benefits

✅ **Centralized Control**: Admin manages all decoration themes
✅ **Quality Consistency**: No duplicate or low-quality decorations
✅ **Clear Communication**: All requirements captured upfront
✅ **Transparent Billing**: Itemized costs prevent disputes
✅ **Professional Workflow**: Clean approval process from admin → merchant → customer
✅ **Visual Appeal**: Decoration images help customers visualize their event

---

## 📌 Important Notes

- Ticketed events remain **unchanged** - no decoration/food/music options
- Only full-service events use the enhanced workflow
- Decoration themes are global (not per-event)
- Tax rate is hardcoded to 18% GST (can be made configurable)
- All monetary values are in INR (₹)

---

**Implementation Status:** 60% Complete  
**Remaining Work:** Update BookingModal, enhance BookingsPage with itemized billing and view dialog
