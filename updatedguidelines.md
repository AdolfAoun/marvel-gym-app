You are working on the Marvel Gym mobile app.

Important project update:
Phase 1 basic development is now complete.

The app already has the main frontend foundation, navigation, screens, mock data, service-layer structure, and core member-facing flows. We are no longer in the “basic setup” stage.

We are now entering a refinement / product-delivery phase.

Current phase:
Frontend product polish and detailed feature refinement.

This means:
- Improve UI/UX quality.
- Polish screens so the app feels ready to present.
- Fix layout issues.
- Improve wording, spacing, hierarchy, animations, modals, bottom sheets, and visual consistency.
- Complete missing frontend-only flows.
- Keep mock data and mock services for now.
- Keep everything backend-ready.
- Do not start real backend integration yet.

Backend status:
Backend integration is NOT part of the current phase.

Backend/Gmind integration will be Phase 3.

In Phase 3:
- Gmind will become the real source of truth.
- Membership status, payments, members, QR validation, classes, products, and other live data will connect to Gmind/backend.
- Mock service implementations will be replaced with real API/database calls.
- Screens should ideally not need major rewrites because they should already be using the service layer.

Current development rules:
- Keep the architecture:
  Screen → Service → Mock Data

Future architecture:
  Screen → Service → Gmind Backend

Do not:
- Import mock data directly inside screens.
- Add admin dashboards.
- Add staff-side workflows.
- Hardcode backend assumptions.
- Build real Gmind integration yet.
- Rewrite the architecture unless absolutely necessary.
- Break existing navigation, login, tabs, QR, home, membership, shop, journey, help, or profile flows.

Do:
- Treat the app as a frontend product that is being prepared for delivery/demo.
- Make the design more professional, premium, modern, and consistent.
- Keep the Marvel Gym identity: red, black, white, premium gym style.
- Keep screens clean and not chaotic.
- Use reusable components where useful.
- Keep all data access through services.
- Add or update mock services when new frontend behavior needs mock data.
- Run TypeScript checks after changes:
  npx tsc --noEmit

Mental model:
Phase 1 = basic frontend foundation, completed.
Current phase = detailed frontend polishing and product refinement.
Phase 3 = backend/Gmind integration later.

Summary:
# Marvel Gym App – Current Project Status Summary

## 1. Project Phase

Phase 1 basic frontend development is considered complete.

The app now has:
- Core frontend structure
- Navigation
- Main tabs/screens
- Mock data
- Service-layer architecture
- Member-facing flows
- Polished visual direction

We are now in the product refinement / delivery preparation phase.

This means the focus is no longer basic setup. The focus now is:
- UI/UX polish
- Small layout fixes
- Better wording
- Better spacing
- Better modals/bottom sheets
- Cleaner screen hierarchy
- Final frontend-only feature refinements
- Preparing the app to feel demo/product-ready

Backend integration is not being done yet.

Backend/Gmind integration will be Phase 3.

---

## 2. Architecture Status

Current architecture:

Screen → Service → Mock Data

Future architecture:

Screen → Service → Gmind Backend

Important rule:
Screens should not import mock data directly.

Mock data should stay behind service-layer functions so that when Gmind/backend integration starts later, the screens do not need to be rewritten.

The app is still frontend-only and backend-ready.

---

## 3. Tech Stack

The app is built with:

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Mock services/data for Phase 1
- Future Gmind integration planned for Phase 3

Expo Go has been used for mobile testing.

---

## 4. Navigation / Tabs

The app currently uses bottom-tab navigation.

Main member-facing tabs include:

- Home
- Membership
- Classes
- Gym Shop
- Journey
- Help
- Profile

The new Help tab is meant to replace “How it works” being inside Journey.

Help tab purpose:
- How the app works
- Instructions
- Future AI Assistant placeholder
- “AI Assistant coming soon”

Journey should stay focused on:
- Visits
- Attendance
- Workout timer
- Average calories burned
- Consistency dashboard

---

## 5. Login / Create Account

Login page:
- Has a premium Marvel Gym theme
- Red/black/white identity
- Phone-first login
- Optional email login
- Continue as Guest
- Forgot password placeholder
- Improved design, but still needs final polish:
  - Red glow/circle should not cover the Marvel Gym logo
  - Logo should blend cleanly, with transparent inside/background
  - Background image should be slightly more visible
  - Overall page should stay premium but not overly red

Create Account page requested:
- Same theme as login
- Fields:
  - First name
  - Family name
  - Phone number
  - Date of birth
  - Gender
  - Password
- No email during registration
- Strict validation:
  - No random symbols/numbers in names
  - Lebanese phone format
  - Valid date of birth
  - Password minimum 5 characters
  - Password includes letter, number, and special character
- After successful mock registration:
  - Return to login
  - Show success message if possible

---

## 6. Home Screen

Home is now one of the main polished dashboard screens.

Current/refined requirements:
- Top welcome section should look fancier and more premium
- Phrase should be:
  - “Consistency is key.”
- Membership days circle should:
  - Be based on membership start and end date
  - Decrease clockwise as membership gets closer to expiration
  - Lose strips/segments over time
  - Change color gradually:
    - Green
    - Green-yellow
    - Yellow
    - Orange
    - Red
    - Dark red near expiration

Quick Actions:
- Open QR
- Freeze / Unfreeze
- Renew/Extend

Quick Actions refinements:
- Make the whole box smaller and more refined
- Remove badges like QR / FR / RN
- Center buttons/cards properly
- Open QR should be red
- Freeze should be red
- Renew/Extend should be red
- Unfreeze should be green
- Do not over-explain under each action

Updates:
- Add a clear “Updates” heading above update/action status items
- This makes the section feel categorized, not floating

Vouchers:
- Section title should simply be:
  - “Vouchers”
- Remove extra small red “Vouchers” chip/badge
- Status tabs should be side-by-side, not stacked
- Current preferred order:
  - Confirmed
  - Pending
  - Canceled

---

## 7. QR Modal

Open QR works, but the QR popup had UI issues.

Needs:
- Modal should fit inside screen
- No red button out of bounds
- Add clear close/X button
- Should be safe-area aware
- QR content centered and readable
- Tapping outside can close
- Modal should not trap the user

Also after opening QR and closing after scan, the app can ask:
- “Add today as a gym visit?”
- Buttons:
  - Add
  - Cancel

---

## 8. Membership / Freeze / Renew

Membership rules:
- Gmind will eventually control real membership status
- Users should not confirm membership activation inside the app
- Pay-at-counter can show Pending Approval, but final activation later comes from Gmind/admin side

Renew/Extend:
- Should not be fixed only to 1, 3, 6, 12 months
- Should be scalable from 1 to 12 months
- Use clean UI like slider/stepper/selector
- Pricing should remain backend-ready, not permanently hardcoded

Freeze:
- Display price as $10/week
- In the freeze popup, keep the description
- Near the total, remove “$10/week”
- Only show the total
- Freeze popup should look more premium
- Bottom sheet should be draggable down to close
- Tap-outside-to-close should still work

Renew/Extend popup:
- Also needs premium bottom-sheet styling
- Should be draggable down to close
- Tap-outside-to-close should remain

---

## 9. Gym Shop

Shop has been simplified.

Current direction:
- Rename to:
  - “Gym Shop”
- Only show products
- Show availability
- Keep price filtering/sorting
- Remove voucher/reservation/cart/claim system
- Remove reservation-related toasts
- Remove “Level 1” if it appears

Reason:
The shop is mainly to show members what products are available and their prices, not to reserve or pay through the app for now.

---

## 10. Vouchers

Shop vouchers/reservations were removed from the Shop tab.

Home can still have a general “Vouchers” section for:
- Membership vouchers
- Coming-soon voucher types
- Future app-related vouchers

Statuses:
- Confirmed
- Pending
- Canceled

No need to call them “Shop Vouchers”.

---

## 11. Journey Tab

Journey currently focuses on member consistency/tracking.

Current direction:
- Remove “How it works” from Journey and move it to the new Help tab
- Attendance calendar should be compact
- Show one month at a time
- Add arrows near month title to switch months
- Switch positions of:
  - Avg calories burned
  - Visits this year
- Rename “Estimated calories” to:
  - “Avg calories burned”
- Remove gym plan section for now because the UI was not good
- Keep dashboard but improve design, wording, spacing, and hierarchy

Workout timer:
- Start
- Pause
- End/Stop
- Calculate average workout duration
- Estimate average calories burned based on duration

---

## 12. Machine Guide

Machine Guide exists and the “Go” entry card is liked.

Current desired flow:
- Keep the Go button/card
- After pressing it, show clean categories:
  - Chest
  - Back
  - Shoulders
  - Arms
  - Legs
  - Core if needed
- When pressing a category, show machines for that category
- Machines should appear in a grid, around 3–4 per row depending on screen size
- Pressing a machine opens its details
- Remove ugly “(tabs)” text from the header
- Keep the nice top-left back button
- Improve the machine guide page visually

---

## 13. Profile

Profile should have one clean section:

Details

Remove:
- “Locked member details”
- “Editable”

Under Details:

Disabled / greyed-out:
- First name
- Family name
- Phone number
- Date of birth

Editable:
- Email
- Residency place
- Payment method

The disabled fields should be readable but clearly not editable.

---

## 14. Backend / Gmind Plan

Backend is not now.

Phase 3 will handle:
- Gmind integration
- Real membership status
- Real payments
- QR validation
- Product data
- Class data
- Member profile synchronization
- Admin-controlled activation/suspension/freezing logic

Until then:
- Use mock data
- Use services
- Keep frontend backend-ready

---

## 15. Current Development Mindset

The project is past basic development.

Now Codex should treat every task as:
- Product polish
- Delivery refinement
- UI cleanup
- Flow correction
- Frontend-only behavior improvement

Not:
- Backend integration
- Admin system building
- Big architecture rewrite
- Random feature expansion