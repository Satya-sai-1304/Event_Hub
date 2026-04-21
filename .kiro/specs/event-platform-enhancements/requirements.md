# Requirements Document

## Introduction

This document defines requirements for four targeted enhancements to the event booking platform:

1. **Service Type Management** — A new CRUD page for managing service types (e.g., Catering, Photography), plus replacing the hardcoded type dropdown in the Services form with a dynamic query.
2. **Back Button on Browse Events** — A back-navigation button on the Browse Events page so users can return to the previous page.
3. **Quick Services Filtering Fix** — Correcting the navigation URLs for Birthday, Catering, and Photography quick service cards so they filter correctly.
4. **Ticket Generation Fix** — Replacing the stuck QR spinner with a properly generated ticket that includes a ticket ID, ticket types, QR code, and booking details.

---

## Glossary

- **ServiceType**: A category of service offered by merchants (e.g., Catering, Photography, Decoration). Distinct from event categories.
- **ServiceTypesPage**: The new admin/merchant CRUD page for managing service types.
- **ServicesPage**: The existing merchant page for managing individual services offered.
- **BrowseEventsPage**: The customer-facing page for browsing events and services.
- **CustomerDashboard**: The customer home page containing Quick Services shortcut cards.
- **Quick Services**: Shortcut cards on the CustomerDashboard (Wedding, Birthday, Catering, Photography) that navigate to filtered results.
- **TicketDialog**: The modal dialog in MyBookingsPage that displays a customer's event ticket.
- **TicketData**: A frontend-only data structure holding all information needed to render a ticket.
- **QR_Generator**: The client-side QR code generation utility using the `qrcode` npm package.
- **System**: The React + TypeScript SPA frontend communicating with the backend at `http://localhost:5000/api`.

---

## Requirements

### Requirement 1: Service Type CRUD Management

**User Story:** As a merchant or admin, I want to manage service types through a dedicated page, so that I can define the categories of services available on the platform.

#### Acceptance Criteria

1. THE ServiceTypesPage SHALL display a list of all service types, including both default and custom types.
2. WHEN a user submits a valid new service type name, THE ServiceTypesPage SHALL send a POST request to `/api/service-types` and add the new type to the list.
3. IF a user submits a service type with an empty name, THEN THE ServiceTypesPage SHALL prevent submission and display a validation error.
4. WHEN a user edits a custom service type and submits valid changes, THE ServiceTypesPage SHALL send a PATCH request to `/api/service-types/:id` and reflect the updated name in the list.
5. WHEN a user deletes a custom service type, THE ServiceTypesPage SHALL send a DELETE request to `/api/service-types/:id` and remove it from the list.
6. WHILE a service type has `isDefault: true`, THE ServiceTypesPage SHALL disable the delete action for that type.
7. THE ServiceTypesPage SHALL be accessible to users with the roles `organizer`, `admin`, or `merchant`.

---

### Requirement 2: Dynamic Service Type Dropdown in Services Form

**User Story:** As a merchant, I want the service type dropdown in the Services form to reflect the actual service types on the platform, so that I can accurately categorize my services.

#### Acceptance Criteria

1. WHEN the ServicesPage form is opened, THE ServicesPage SHALL fetch service types from `/api/service-types` and populate the type dropdown with the results.
2. WHEN the `/api/service-types` endpoint is unavailable, THE ServicesPage SHALL fall back to displaying a default set of service type options so the form remains usable.
3. WHEN a new service type is added via ServiceTypesPage, THE ServicesPage type dropdown SHALL reflect the new type on next load without requiring a code change.

---

### Requirement 3: Back Button on Browse Events Page

**User Story:** As a customer, I want a back button on the Browse Events page, so that I can return to the page I came from without using the browser controls.

#### Acceptance Criteria

1. WHEN the BrowseEventsPage is rendered and `window.history.length > 1`, THE BrowseEventsPage SHALL display a back button in the page header.
2. WHEN a user clicks the back button, THE System SHALL navigate to the previous page using `navigate(-1)`.
3. WHILE `window.history.length` is 1 or less (direct navigation), THE BrowseEventsPage SHALL hide the back button.

---

### Requirement 4: Quick Services Filtering Fix

**User Story:** As a customer, I want the Quick Services shortcuts on my dashboard to navigate to correctly filtered results, so that I can find relevant events or services without manual searching.

#### Acceptance Criteria

1. WHEN a customer clicks the "Wedding" Quick Services card, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?category=Wedding&tab=events`.
2. WHEN a customer clicks the "Birthday" Quick Services card, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?category=Birthday&tab=events`.
3. WHEN a customer clicks the "Catering" Quick Services card, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?tab=services&type=Catering`.
4. WHEN a customer clicks the "Photography" Quick Services card, THE CustomerDashboard SHALL navigate to `/dashboard/browse-events?tab=services&type=Photography`.
5. WHEN BrowseEventsPage receives a `category` URL parameter, THE BrowseEventsPage SHALL perform a case-insensitive partial match against server category names and apply the matching category as a filter.
6. WHEN BrowseEventsPage receives a `type` URL parameter, THE BrowseEventsPage SHALL set the service type filter and activate the services tab.
7. IF no server category matches the `category` URL parameter, THEN THE BrowseEventsPage SHALL display all events without applying a category filter.

---

### Requirement 5: Ticket Generation Fix

**User Story:** As a customer, I want to view a properly generated ticket with a working QR code when I click "View Ticket" on a paid booking, so that I have a valid ticket to present at the event.

#### Acceptance Criteria

1. WHEN a customer clicks "View Ticket" on a paid ticketed booking, THE TicketDialog SHALL attempt to fetch ticket data from `/api/bookings/:id/ticket`.
2. IF the `/api/bookings/:id/ticket` endpoint returns an error or is unavailable, THEN THE System SHALL generate ticket data client-side using the booking's existing fields.
3. WHEN ticket data is being loaded, THE TicketDialog SHALL display a loading indicator.
4. WHEN ticket data has loaded successfully, THE TicketDialog SHALL display a QR code image instead of a loading spinner.
5. THE TicketDialog SHALL display the ticket ID, which is either `booking.ticketId` or a derived value in the format `TKT-XXXXXXXX` based on the booking ID.
6. THE TicketDialog SHALL display the event title, event date, customer name, and number of guests.
7. THE TicketDialog SHALL display the ticket types booked, derived from `booking.selectedTickets` or falling back to a single row using `booking.ticketType` and `booking.guests`.
8. THE TicketDialog SHALL display the total amount paid, calculated as `booking.finalAmount` or `booking.totalPrice + booking.additionalCost`.
9. WHEN the QR code is displayed, THE TicketDialog SHALL enable a download button that saves the QR code image as a PNG file.
10. IF both the server endpoint and client-side QR generation fail, THEN THE TicketDialog SHALL display the ticket ID as text in place of the QR code image.

---

### Requirement 6: QR Code Generation

**User Story:** As a customer, I want the QR code on my ticket to encode my booking information, so that event staff can validate my ticket at entry.

#### Acceptance Criteria

1. WHEN generating a QR code client-side, THE QR_Generator SHALL encode a string containing the ticket ID, booking ID, event title, and event date.
2. THE QR_Generator SHALL return a valid `data:image/png;base64,...` data URL.
3. IF the QR_Generator encounters an error, THEN THE QR_Generator SHALL return an empty string rather than throwing an exception.
