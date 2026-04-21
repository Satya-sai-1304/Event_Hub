# Implementation Plan: Event Platform Enhancements

## Overview

Four targeted improvements implemented incrementally: ServiceTypesPage CRUD, dynamic type dropdown in ServicesPage, back button on BrowseEventsPage, Quick Services navigation fix, and ticket dialog with client-side QR generation.

## Tasks

- [x] 1. Install qrcode package
  - Run `npm install qrcode @types/qrcode` inside `frontend/`
  - Verify the package appears in `frontend/package.json` dependencies
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Create ServiceTypesPage
  - [x] 2.1 Create `frontend/src/pages/dashboard/ServiceTypesPage.tsx`
    - Model the component on `CategoriesPage.tsx` (same CRUD pattern)
    - Fetch from `/api/service-types` (no merchantId filter — global list)
    - Display all service types in a table with Name, Description, Default badge, and Actions columns
    - Add/Edit dialog with name + description fields; validate name is non-empty before submitting
    - POST to `/api/service-types` on add, PATCH to `/api/service-types/:id` on edit
    - DELETE to `/api/service-types/:id` on delete; disable the delete button when `isDefault === true`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 Write property test for ServiceTypesPage rendering
    - **Property 1: All service types are rendered**
    - **Property 2: Default service types cannot be deleted**
    - **Property 3: Service type name validation rejects blank input**
    - **Validates: Requirements 1.1, 1.3, 1.6**

- [x] 3. Register ServiceTypesPage route and sidebar link
  - [x] 3.1 Add route in `frontend/src/App.tsx`
    - Import `ServiceTypesPage` and add `<Route path="service-types" element={<ServiceTypesPage />} />` inside the `organizer/admin/merchant` protected route block (alongside `categories`)
    - _Requirements: 1.7_

  - [x] 3.2 Add sidebar navigation link in `frontend/src/components/AppSidebar.tsx`
    - Add a "Service Types" nav item (use `Layers` or `Tag` icon from lucide-react) visible to `organizer`, `admin`, `merchant` roles, pointing to `/dashboard/service-types`
    - _Requirements: 1.7_

- [x] 4. Dynamic service type dropdown in ServicesPage
  - [x] 4.1 Replace hardcoded type arrays in `frontend/src/pages/dashboard/ServicesPage.tsx`
    - Add a `useQuery` for `['service-types']` fetching `/api/service-types`; default to `[]` on error
    - Replace the `(formData.category === 'Wedding Planning' ? WEDDING_SERVICES : GENERAL_SERVICES).map(...)` block in the type `<Select>` with `serviceTypes.map(st => <SelectItem key={st._id} value={st.name}>{st.name}</SelectItem>)`
    - Remove the `onValueChange` side-effect that resets `type` based on category (no longer needed)
    - Keep `WEDDING_SERVICES` / `GENERAL_SERVICES` arrays as the fallback when `serviceTypes` is empty
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.2 Write property test for ServicesPage dropdown
    - **Property 4: ServicesPage dropdown reflects API results**
    - **Validates: Requirements 2.1**

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add back button to BrowseEventsPage
  - [x] 6.1 Modify `frontend/src/pages/dashboard/BrowseEventsPage.tsx`
    - Import `ArrowLeft` from `lucide-react`
    - In the page header `<div>`, add a back button before the title: `{window.history.length > 1 && (<Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>)}`
    - `useNavigate` is already imported; no new imports needed beyond `ArrowLeft`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 6.2 Write property test for back button visibility
    - **Property 5: Back button visibility matches history depth**
    - **Validates: Requirements 3.1, 3.3**

- [x] 7. Fix Quick Services navigation in CustomerDashboard
  - [x] 7.1 Update Quick Services URLs in `frontend/src/pages/dashboard/CustomerDashboard.tsx`
    - Replace the four hardcoded URL strings in the Quick Services array:
      - `Wedding` → `"/dashboard/browse-events?category=Wedding&tab=events"`
      - `Birthday` → `"/dashboard/browse-events?category=Birthday&tab=events"`
      - `Catering` → `"/dashboard/browse-events?tab=services&type=Catering"`
      - `Photography` → `"/dashboard/browse-events?tab=services&type=Photography"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Handle `type` URL param in `frontend/src/pages/dashboard/BrowseEventsPage.tsx`
    - In the `useEffect` that reads URL params, add handling for the `type` search param: read it with `searchParams.get('type')`, call `setServiceTypeFilter(type)` and `setActiveTab('services')` when present
    - Verify the existing `category` param logic uses case-insensitive partial matching (`c.name.toLowerCase().includes(category.toLowerCase())`) — adjust if needed
    - _Requirements: 4.5, 4.6, 4.7_

  - [ ]* 7.3 Write property tests for URL param handling
    - **Property 6: Category URL param applies correct filter**
    - **Property 7: Type URL param activates services tab**
    - **Validates: Requirements 4.5, 4.6, 4.7**

- [x] 8. Fix ticket dialog in MyBookingsPage
  - [x] 8.1 Add `generateTicketQR` and `buildTicketData` utilities in `frontend/src/pages/dashboard/MyBookingsPage.tsx`
    - Import `QRCode` from `'qrcode'`
    - Implement `generateTicketQR(booking)`: derive `ticketId` as `booking.ticketId ?? \`TKT-${booking.id.slice(-8).toUpperCase()}\``, encode `\`${ticketId}|${booking.id}|${booking.eventTitle}|${booking.eventDate}\`` via `QRCode.toDataURL(...)`, catch all errors and return `''`
    - Implement `buildTicketData(booking)`: populate all `TicketData` fields; derive `selectedTickets` from `booking.selectedTickets` or fall back to `[{ name: booking.ticketType ?? 'General', quantity: booking.guests, price: booking.totalPrice }]`; compute `totalAmount` as `booking.finalAmount ?? (booking.totalPrice + (booking.additionalCost ?? 0))`
    - _Requirements: 5.2, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.3_

  - [ ]* 8.2 Write property tests for ticket utilities
    - **Property 8: Ticket dialog renders required fields for any booking**
    - **Property 10: QR code encodes required booking fields**
    - **Property 11: QR generator returns a valid data URL**
    - **Property 12: QR generator never throws**
    - **Validates: Requirements 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.3**

  - [x] 8.3 Wire ticket dialog open flow in `MyBookingsPage`
    - Add state: `ticketData: TicketData | null` and `ticketLoading: boolean`
    - Add a `useEffect` that fires when `ticketDialogOpen && selectedBooking`: sets `ticketLoading(true)`, tries `api.get('/bookings/:id/ticket')`, on success maps response to `TicketData`, on error calls `buildTicketData` + `generateTicketQR` as fallback, then sets `ticketData` and `ticketLoading(false)`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.4 Update ticket dialog JSX in `MyBookingsPage`
    - Replace `selectedBooking.billQrCode` spinner logic with: show `<Loader2>` while `ticketLoading`, show `<img src={ticketData.qrCodeUrl}>` when loaded, show ticket ID text fallback when `qrCodeUrl` is empty
    - Add ticket types table rows from `ticketData.selectedTickets`
    - Add total amount display from `ticketData.totalAmount`
    - Update download button to use `ticketData.qrCodeUrl` and enable only when non-empty
    - Reset `ticketData` to `null` when dialog closes (`onOpenChange` handler)
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [ ]* 8.5 Write property test for QR renders instead of spinner
    - **Property 9: QR code replaces spinner when data is loaded**
    - **Validates: Requirements 5.4, 5.9**

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The `qrcode` package must be installed (task 1) before task 8 can compile
- ServiceTypesPage (task 2) must exist before the ServicesPage dropdown fix (task 4) will have real data to show
- Property tests use the correctness properties defined in `design.md`
