# Marvel Gym Mobile Application – Phase 1 Specification

## Project Overview

Marvel Gym currently has an existing mobile application connected to Gmind, which is the gym's management system. Gmind handles gym operations such as members, memberships, payments, schedules, products, check-ins, pricing, and other business data.

The objective of this project is to redesign and modernize the Marvel Gym member application while maintaining compatibility with the existing Gmind ecosystem.

Phase 1 focuses on building a complete frontend application with clean architecture, mock data, and backend-ready services. Backend integration will be implemented later once access to the existing source code, APIs, or database becomes available.

If Gmind does not provide suitable APIs, a future Phase 2 may involve creating a custom backend/database solution while preserving existing gym data.

---

# Technology Stack

## Frontend

* React Native
* Expo
* Single shared codebase
* iOS support
* Android support

## Future Considerations

* Web version may be considered later.
* Current priority is mobile only.

---

# Development Principles

* Use mock data during Phase 1.
* Separate UI from backend logic.
* Create reusable components.
* Create a dedicated service/API layer.
* Avoid assumptions about database structure.
* Avoid hardcoded backend logic.
* Keep architecture flexible for future Gmind integration.
* Build all screens and functionality so backend integration can later be added with minimal frontend modifications.
* All screens must use service-layer functions only and never access data directly.
* All mock data must flow through services to guarantee easy future Gmind integration.

---

# Backend Synchronization Philosophy

This is a member-only application.

Administrative functionality should never be implemented inside the mobile application.

All administrative operations remain managed through Gmind or other staff systems on the gym's laptop/admin side.

Examples include:

* Membership management
* Member management
* Product management
* Pricing management
* Schedule management
* Reports
* Staff management
* Check-in administration

The mobile application should always synchronize with Gmind.

Changes made in Gmind should automatically appear in the application.

Changes made by members through the application should synchronize back to Gmind.

Gmind remains the primary source of truth for all gym data.

---

# Application Scope

The application is intended exclusively for gym members.

The application should not include:

* Trainer booking
* Workout tracking
* Progress tracking
* Body measurements
* Exercise logging
* Staff functionality
* Admin dashboards

These features are outside the scope of Phase 1.

---

# Registration

Anyone should be able to create an account.

Registration should support:

* Email address + password
* Phone number + password

During registration, the application should collect basic member information.

After backend integration, account creation should automatically create and synchronize a member record within Gmind.

---

# Authentication

Members should be able to:

* Login
* Logout

using either:

* Email + password
* Phone number + password

Authentication should eventually synchronize with Gmind.

---

# Profile Management

Members should be able to:

* View profile information
* Edit profile information
* Update email address
* Update phone number
* Update personal details

Any profile changes should automatically synchronize with Gmind.

---

# Membership System

## Membership Rules

A member may have only one active membership at any given time.

The application should not support:

* Multiple active memberships
* Multiple subscription packages
* Additional membership tiers running simultaneously

---

## Membership Status Values

Membership status should always come from Gmind/backend.

Supported statuses:

* Active
* Expired
* Frozen
* Suspended
* Pending Approval

### Active

The membership is valid and the member has access to gym features.

### Expired

The membership has ended and must be renewed.

### Frozen

The member has temporarily frozen the membership.

### Suspended

The membership has been suspended by gym administration.

### Pending Approval

Used when a member selects Pay at Counter.

The membership remains pending until staff confirms payment and activates it through Gmind.

Once activated in Gmind, the application should automatically update the status to Active.

---

# Membership Activation

Members should be able to activate memberships through:

## Online Payments

* Visa
* Mastercard
* Whish Money

## Offline Payment

* Pay at Counter

For Pay at Counter:

1. Member submits request.
2. Membership status becomes Pending Approval.
3. Staff receives payment physically.
4. Staff activates membership in Gmind.
5. Application automatically updates membership status to Active.

Members should be able to purchase memberships:

* Monthly
* Multiple months in advance
* Up to one year in advance

The exact membership plans, durations, and pricing should ultimately come from Gmind/backend.

Mock plans may be used during Phase 1.

---

# Membership Plans

Members should be able to:

* View available plans
* View pricing
* Select plans for activation

Pricing should come from Gmind/backend and should not be permanently hardcoded.

---

# Membership Freeze

Members should be able to freeze memberships directly from the application.

## Freeze Pricing

Current pricing:

* 1 week = $10
* 2 weeks = $20
* 3 weeks = $30

Formula:

Freeze Cost = Number of Weeks × Weekly Freeze Price

The weekly freeze price should eventually be loaded from Gmind.

## Freeze Duration

Backend policy allows unlimited freeze duration.

For cleaner UI, the application may initially display options such as:

* 1 week
* 2 weeks
* 3 weeks
* ...
* 12 weeks

Members may:

* Freeze multiple times throughout their membership
* Start a freeze immediately
* Select a future freeze start date

Members may not create a new freeze while already frozen.

If already frozen, they may:

* Extend the current freeze period
* Unfreeze their membership

Freeze payments should support:

* Visa
* Mastercard
* Whish Money
* Pay at Counter

---

# Membership Renewal Behavior

When a membership expires:

* Membership status becomes Expired.
* QR access immediately becomes invalid.
* The QR code should no longer be visible.

When a membership is renewed or reactivated:

* Membership status becomes Active.
* A new QR code should be generated.
* QR access becomes available again.

Payment-related status changes should not occur until payment has been confirmed by Gmind/backend.

---

# QR Code Entry System

Each member should have a QR code associated with their account.

The QR code should only be displayed when membership status is Active.

Hide the QR code when membership is:

* Expired
* Frozen
* Suspended
* Pending Approval

## QR Renewal

QR codes should be regenerated upon:

* Membership renewal
* Membership reactivation

Additional periodic QR regeneration may be added later for security purposes.

## Security

Possessing a QR code alone should never grant access.

When scanned:

1. Scanner contacts backend/Gmind.
2. Membership status is verified.
3. Entry is approved or denied.

---

# Classes

Members should be able to:

* View classes
* View class details
* Register for classes
* Cancel class registrations themselves

No waitlist system is required.

Classes may be:

* Free
* Paid

Paid classes should support:

* Visa
* Mastercard
* Whish Money
* Pay at Counter

Classes should display availability status:

* Available
* Full

Members should only be able to register when a class is available.

If trainer information is displayed, trainer names are sufficient.

No trainer profiles are required.

---

# Products

Members should be able to:

* View products
* Purchase products

Examples:

* Water
* Energy drinks
* Supplements
* Other gym merchandise

Payment options:

* Visa
* Mastercard
* Whish Money
* Pay at Counter

Members may either:

* Pay directly through the application
* Reserve and pay at the gym counter

For Phase 1, inventory management is not required.

Assume product availability is managed by Gmind.

---

# Payment History

Members should be able to view their payment history.

For Phase 1, payment history should remain simple.

Display:

* Transaction date
* Transaction amount

Payment history may include:

* Membership payments
* Membership freeze payments
* Product purchases
* Class payments

Detailed invoices and receipts are not required.

---

# Notifications

Phase 1 should use in-app notifications only.

Push notifications are not required.

Examples:

* Membership activated
* Membership renewed
* Membership expiring soon
* Freeze approved
* Freeze extended
* Membership unfrozen
* Payment confirmation
* Product purchase confirmation
* Class registration confirmation
* Class cancellation confirmation

---

# Automatic Data Refresh

The application should automatically refresh important data from Gmind/backend.

Examples:

* Membership status
* QR access
* Payment confirmations
* Class registrations
* Profile updates

Users should not be required to manually pull-to-refresh for important updates.

---

# Home Dashboard

The Home Dashboard should provide a quick overview of important member information.

Suggested dashboard content:

* Membership Status Card
* Days Remaining Card
* QR Code Shortcut
* Upcoming Classes
* Recent Notifications Preview
* Quick Actions:

  * Renew Membership
  * Freeze Membership
  * Products Store

---

# Main Service Functions

Create placeholder service functions for:

* registerMember()
* loginMember()
* logoutMember()
* getMembershipStatus()
* activateMembership()
* freezeMembership()
* unfreezeMembership()
* getScheduledClasses()
* registerForClass()
* cancelClassRegistration()
* getMembershipPlans()
* getProducts()
* buyProduct()
* payMembership()
* updateProfile()
* getPaymentHistory()
* showQRCode()

Initially these functions should return mock data.

Later they will connect to the real backend.

---

# Recommended Screens

1. Login
2. Register
3. Home Dashboard
4. Membership Status
5. Membership Plans
6. Membership Activation
7. Membership Freeze
8. QR Entry
9. Class Schedule
10. Class Registration
11. Products Store
12. Payment History
13. Notifications
14. Profile Settings

---

# Phase 1 Goal

Build a complete modern Marvel Gym mobile application featuring:

* Professional UI/UX
* Real navigation flow
* Mock services
* Clean architecture
* Backend-ready structure
* React Native + Expo implementation

without requiring access to:

* Existing source code
* Existing database
* Existing APIs
* Existing Gmind implementation

so that backend integration can be added later with minimal changes to the frontend architecture.
