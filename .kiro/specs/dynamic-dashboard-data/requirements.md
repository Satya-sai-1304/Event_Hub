# Requirements Document

## Introduction

This feature makes all data across the customer dashboard, admin dashboard, invoices, and tickets fully dynamic — sourced from real API data with no hardcoded or static values. Specifically:

1. **Quick Services (Customer Dashboard)** — The Quick Services section shows the top/most-booked events and services dynamically, ranked by actual booking frequency.
2. **Admin Dashboard — Payment Requests** — Payout/payment request data is fetched live from the API and reflects real merchant requests with actual amounts and statuses.
3. **Admin Dashboard — Revenue Reports** — Revenue calculations (total sales, commission, net earnings) are computed from real booking data, with the commission rate sourced from platform settings rather than hardcoded.
4. **Dynamic Costs and Prices** — Every amount displayed (booking totals, advance amounts, remaining balances) is derived from actual booking fields, never hardcoded.
5. **Invoices** — Invoice documents generated for bookings contain data pulled directly from the booking record — no placeholder or mismatched values.
6. **Tickets** — Event tickets display data from the actual booking and event records — ticket ID, event title, date, customer name, ticket types, and total amount all match the real booking.

---

## Glossary

- **CustomerDashboard**: The home page for customers, containing Quick Services shortcuts, latest bookings, and event listings.
- **Quick_Services**: The shortcut card grid on the CustomerDashboard that links to filtered browse results.
- **Top_Booked_Item**: An event or service ranked by the number of confirmed/paid bookings it has received.
- **AdminDashboard**: The admin home page containing tabs for users, events, bookings, payout requests, revenue reports, and more.
- **Payout_Request**: A merchant's request to withdraw their earned balance, stored in the backend at `/api/merchants/payouts/all`.
- **Revenue_Report**: A per-merchant breakdown of total sales, platform commission, and net earnings, computed from booking data.
- **Commission_Rate**: The platform's percentage fee applied to merchant sales, sourced from `/api/settings`.
- **Invoice**: A PDF document generated for a booking, containing itemized cost breakdown, customer details, and event details.
- **Ticket**: A PDF/dialog document generated for a ticketed event booking, containing ticket ID, QR code, event details, and ticket type breakdown.
- **TicketData**: The frontend data structure holding all fields needed to render a ticket.
- **Invoice_Data**: The frontend data structure holding all fields needed to render an invoice.
- **Booking**: A booking record from `/api/bookings`, containing fields: `id`, `eventTitle`, `eventDate`, `customerName`, `guests`, `totalPrice`, `additionalCost`, `finalAmount`, `advanceAmount`, `advancePaid`, `selectedTickets`, `ticketType`, `organizerId`, `status`, `paymentStatus`.
- **System**: The React + TypeScript SPA frontend communicating with the backend at `http://localhost:5000/api`.
- **BrowseEventsPage**: The page at `/dashboard/browse-events` that lists events and services with filter support.

---

## Requirements

### Requirement 1: Top/Most Booked Items in Quick Services

**User Story:** As a customer, I want the Quick Services section to show the most popular events and services based on actual booking data, so that I can quickly find what others are booking most.

#### Acceptance Criteria

1. WHEN the CustomerDashboard loads, THE System SHALL fetch booking counts per event and per service from the API to determine the top-booked items.
2. THE Quick_Services section SHALL display the top 2 most-booked events (by confirmed/paid booking count) as event shortcut cards.
3. THE Quick_Services section SHALL display the top 2 most-booked services (by confirmed/paid booking count) as service shortcut cards.
4. WHEN a customer clicks a top-booked event card in Quick_Services, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?category={categoryName}&tab=events` using the event's actual category name.
5. WHEN a customer clicks a top-booked service card in Quick_Services, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?tab=services&type={serviceType}` using the service's actual type.
6. IF fewer than 2 booked events exist, THEN THE Quick_Services section SHALL fill remaining event slots with the most recently created events.
7. IF fewer than 2 booked services exist, THEN THE Quick_Services section SHALL fill remaining service slots with the most recently created services.
8. WHILE booking data is loading, THE Quick_Services section SHALL display skeleton placeholder cards.
9. THE Quick_Services card SHALL display the event or service name and a relevant icon or image, sourced from the actual event/service record.

---

### Requirement 2: Admin Dashboard — Dynamic Payment Requests

**User Story:** As an admin, I want the Payout Requests tab to show real-time merchant payment requests with accurate amounts and statuses, so that I can process them correctly.

#### Acceptance Criteria

1. WHEN the AdminDashboard Payout Requests tab is active, THE AdminDashboard SHALL fetch payout data from `/api/merchants/payouts/all` and render each request as a table row.
2. THE AdminDashboard SHALL display the merchant name, requested amount, request date, bank details, and current status for each payout request — all sourced from the API response.
3. WHEN a payout request has `status: 'pending'`, THE AdminDashboard SHALL display Approve and Reject action buttons for that row.
4. WHEN an admin approves a payout request, THE AdminDashboard SHALL send a PATCH request to `/api/merchants/payouts/:id` with `{ status: 'approved' }` and refresh the payout list.
5. WHEN an admin rejects a payout request, THE AdminDashboard SHALL send a PATCH request to `/api/merchants/payouts/:id` with `{ status: 'rejected' }` and refresh the payout list.
6. WHEN a payout request has `status: 'approved'`, THE AdminDashboard SHALL display a "Mark as Paid" button that sends `{ status: 'paid' }` to the API.
7. IF the `/api/merchants/payouts/all` endpoint returns an empty array, THEN THE AdminDashboard SHALL display a "No payout requests yet" message in the table.
8. THE AdminDashboard SHALL display the payout amount as `₹{amount}` using the actual `amount` field from the API response, not a hardcoded value.

---

### Requirement 3: Admin Dashboard — Dynamic Revenue Reports

**User Story:** As an admin, I want the Revenue Report tab to show accurate per-merchant revenue breakdowns computed from real booking data, so that I can monitor platform earnings correctly.

#### Acceptance Criteria

1. WHEN the AdminDashboard Revenue Report tab is active, THE AdminDashboard SHALL compute revenue data from bookings with status in `['paid', 'completed', 'confirmed', 'used', 'accepted']`.
2. THE AdminDashboard SHALL display total sales per merchant as the sum of `booking.totalPrice + booking.additionalCost` for all qualifying bookings belonging to that merchant.
3. THE AdminDashboard SHALL fetch the commission rate from `/api/settings` and apply it to compute the commission column, rather than using a hardcoded percentage.
4. IF `/api/settings` is unavailable or does not contain a commission rate, THEN THE AdminDashboard SHALL fall back to a default commission rate of 5%.
5. THE AdminDashboard SHALL compute net earnings per merchant as `totalSales - commission`.
6. THE AdminDashboard SHALL display the total booking count per merchant as the count of qualifying bookings for that merchant.
7. WHEN booking data changes (new payment confirmed), THE AdminDashboard SHALL reflect the updated revenue figures after the next data refresh.
8. IF no merchants have qualifying bookings, THEN THE AdminDashboard SHALL display a "No revenue data available" message in the revenue table.

---

### Requirement 4: Dynamic Costs and Prices Across All Views

**User Story:** As a customer or admin, I want every price and cost shown in the platform to reflect the actual booking data, so that I never see incorrect or mismatched amounts.

#### Acceptance Criteria

1. THE System SHALL compute the total booking amount as `booking.finalAmount` if present, otherwise as `booking.totalPrice + (booking.additionalCost ?? 0)`.
2. THE System SHALL compute the remaining balance as `totalAmount - (booking.advancePaid ?? 0)`.
3. WHEN displaying a booking's advance amount, THE System SHALL use `booking.advanceAmount` from the API response, not a hardcoded value.
4. WHEN displaying a booking's payment status, THE System SHALL derive it from `booking.paymentStatus` and `booking.status` fields from the API response.
5. THE System SHALL display all monetary values formatted as `₹{amount.toLocaleString()}` using the actual computed amount.
6. IF a booking's `totalPrice` or `additionalCost` field is missing or null, THEN THE System SHALL treat the missing field as 0 rather than displaying NaN or undefined.

---

### Requirement 5: Dynamic Invoice Generation

**User Story:** As a customer, I want my invoice to contain accurate data matching my actual booking, so that I have a correct financial record of my purchase.

#### Acceptance Criteria

1. WHEN a customer requests an invoice for a booking, THE System SHALL populate the invoice with data fetched from `/api/bookings/:id` or from the booking object already in state.
2. THE Invoice_Data SHALL include: booking ID, event/service title, event date, customer name, customer email, customer phone, itemized cost breakdown, discount amount, convenience fee, and total amount paid — all sourced from the booking record.
3. THE Invoice_Data SHALL display the organizer/merchant name sourced from the booking's `organizerId` resolved to the merchant's actual name.
4. WHEN a coupon was applied to the booking, THE Invoice_Data SHALL display the coupon code and discount amount from `booking.couponCode` and `booking.discountAmount`.
5. IF `booking.discountAmount` is 0 or absent, THEN THE Invoice_Data SHALL omit the discount line from the invoice rather than showing ₹0.
6. THE Invoice_Data SHALL display the payment date sourced from `booking.updatedAt` or `booking.paidAt`, not a hardcoded date.
7. THE System SHALL generate the invoice as a downloadable PDF with all fields populated from the booking record.
8. IF any required booking field is missing, THEN THE System SHALL display a placeholder label (e.g., "N/A") rather than leaving the field blank or showing undefined.

---

### Requirement 6: Dynamic Ticket Generation

**User Story:** As a customer, I want my event ticket to display accurate data matching my actual booking and event, so that I have a valid ticket with correct information.

#### Acceptance Criteria

1. WHEN a customer opens the ticket dialog for a paid ticketed booking, THE System SHALL attempt to fetch ticket data from `/api/bookings/:id/ticket`.
2. IF the `/api/bookings/:id/ticket` endpoint is unavailable or returns an error, THEN THE System SHALL build ticket data client-side from the booking object in state.
3. THE TicketData SHALL include: ticket ID, event title, event date, customer name, guest count, ticket type breakdown, and total amount paid — all sourced from the booking record.
4. THE TicketData ticket ID SHALL be `booking.ticketId` if present, otherwise derived as `TKT-{booking.id.slice(-8).toUpperCase()}`.
5. THE TicketData total amount SHALL be `booking.finalAmount` if present, otherwise `booking.totalPrice + (booking.additionalCost ?? 0)`.
6. THE TicketData ticket type breakdown SHALL use `booking.selectedTickets` if present, otherwise fall back to a single row using `booking.ticketType` and `booking.guests`.
7. WHEN ticket data has loaded, THE System SHALL generate a QR code encoding the ticket ID, booking ID, event title, and event date.
8. THE System SHALL display the QR code as an image in the ticket dialog, replacing any loading spinner.
9. WHEN a customer downloads the ticket as PDF, THE System SHALL include all TicketData fields in the PDF — no field shall contain a hardcoded or placeholder value that does not match the booking.
10. IF the QR code generation fails, THEN THE System SHALL display the ticket ID as text in place of the QR image rather than showing a broken image or stuck spinner.
11. THE System SHALL display the event date on the ticket formatted as a human-readable date (e.g., "Monday, 15 January 2025") derived from `booking.eventDate`.

---

### Requirement 7: Data Consistency Between Booking, Invoice, and Ticket

**User Story:** As a customer, I want the data shown in my booking summary, invoice, and ticket to be identical, so that I can trust the information across all documents.

#### Acceptance Criteria

1. THE System SHALL use the same source booking record to populate the booking detail view, the invoice, and the ticket — no field shall differ between these three views for the same booking.
2. WHEN `booking.eventTitle` is updated on the server, THE System SHALL reflect the updated title in the booking list, invoice, and ticket after the next data fetch.
3. THE System SHALL display the customer name consistently as `booking.customerName` across the booking detail, invoice, and ticket.
4. THE System SHALL display the total amount consistently using the same formula (`finalAmount ?? totalPrice + additionalCost`) across the booking detail, invoice, and ticket.
5. IF a booking has both `booking.totalPrice` and `booking.finalAmount`, THEN THE System SHALL prefer `booking.finalAmount` as the authoritative total in all views.
