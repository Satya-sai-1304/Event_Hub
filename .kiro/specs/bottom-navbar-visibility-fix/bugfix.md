# Bugfix Requirements Document

## Introduction

Three related bugs affect the mobile bottom navigation bar in the customer dashboard. The navbar is invisible on main navigation pages, partially cut off due to layout overlap, and duplicates navigation items already shown in the sidebar — degrading the mobile UX for customers.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a customer navigates to `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, or `/dashboard/profile-settings` on mobile THEN the system renders the bottom navbar hidden or not visible due to missing route-based visibility logic

1.2 WHEN a customer navigates to `/dashboard/booking/:id`, `/dashboard/checkout`, or `/dashboard/payment` on mobile THEN the system renders the bottom navbar visible when it should be hidden on these flow/process pages

1.3 WHEN the bottom navbar is rendered on mobile THEN the system displays it at 60px height without `env(safe-area-inset-bottom)` padding, causing it to be partially obscured by device chrome on iOS and Android

1.4 WHEN the bottom navbar is rendered on mobile THEN the system does not enforce full viewport width (`100vw`), allowing layout overflow or clipping in some browsers

1.5 WHEN the dashboard layout renders on mobile THEN the system uses `minHeight: "100vh"` which does not account for dynamic browser toolbars, causing the layout to overflow and overlap the bottom navbar

1.6 WHEN a customer views the dashboard on mobile THEN the system renders the full `customerLinks` list (9 items) in the sidebar alongside the bottom navbar, duplicating Home, Events, Bookings, Billing, and Settings navigation items

### Expected Behavior (Correct)

2.1 WHEN a customer navigates to `/dashboard`, `/dashboard/browse-events`, `/dashboard/my-bookings`, `/dashboard/billing-payments`, or `/dashboard/profile-settings` on mobile THEN the system SHALL display the bottom navbar

2.2 WHEN a customer navigates to any path starting with `/dashboard/booking`, `/dashboard/checkout`, or `/dashboard/payment` on mobile THEN the system SHALL hide the bottom navbar by returning null

2.3 WHEN the bottom navbar is rendered on mobile THEN the system SHALL display it at 70px height with `paddingBottom: "env(safe-area-inset-bottom)"` to respect device safe areas

2.4 WHEN the bottom navbar is rendered on mobile THEN the system SHALL enforce `width: "100vw"` and `maxWidth: "100vw"` with `left: "0"` and `right: "0"` to prevent clipping

2.5 WHEN the dashboard layout renders on mobile THEN the system SHALL use `minHeight: "100dvh"` on both the outer and inner flex containers to correctly account for dynamic browser toolbars

2.6 WHEN a customer views the dashboard on mobile THEN the system SHALL render only `customerSecondaryLinks` (e.g. Help & Support) in the sidebar, since primary navigation is already provided by the bottom navbar

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a non-customer user (organizer, admin, merchant) views the dashboard on mobile THEN the system SHALL CONTINUE TO hide the bottom navbar and show full sidebar navigation

3.2 WHEN a customer views the dashboard on desktop THEN the system SHALL CONTINUE TO show the full `customerLinks` list in the sidebar and not render the bottom navbar

3.3 WHEN a customer navigates between main dashboard pages on mobile THEN the system SHALL CONTINUE TO highlight the active nav item in the bottom navbar correctly

3.4 WHEN the bottom navbar is rendered THEN the system SHALL CONTINUE TO use `createPortal` to render into `document.body`, bypassing stacking context issues

3.5 WHEN the main content area renders THEN the system SHALL CONTINUE TO apply sufficient `paddingBottom` (at minimum 100px) to prevent page content from being obscured by the bottom navbar
