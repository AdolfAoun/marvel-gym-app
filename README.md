## Project Progress Summary

Marvel Gym App is a member-facing mobile application built with React Native, Expo SDK 54, Expo Router, and TypeScript.

The project is currently frontend-only. All data is handled through mock data behind a service layer, so screens do not import mock data directly.

Current architecture:

```text
Screen -> Service -> Mock Data
```

Future architecture:

```text
Screen -> Service -> Gmind/backend
```

The app is now in an advanced frontend product refinement and delivery preparation stage. The main member-facing frontend flows are already built, and the UI/UX is approximately 99% complete. Only small visual tweaks, wording improvements, and final polish remain before moving into the next major stages.

## What Has Been Built

* Set up the Expo Router app structure under `src/app`.
* Added thin route files that render screen components from `src/screens`.
* Created shared TypeScript models in `src/types`.
* Added mock data in `src/mock`.
* Added backend-ready service-layer functions in `src/services`.
* Built a member-focused app direction, keeping admin tooling separate from member tabs.
* Added a separate frontend-only mock admin/testing portal for demo and future planning.
* Added Marvel Gym branding, visual identity, and image assets.
* Built polished onboarding/auth screens:
  * Startup/loading experience
  * Welcome screen
  * Login screen
  * Create account screen
* Added main member-facing navigation and screens.
* Built core member screens:
  * Home
  * Classes
  * Gym Shop
  * Journey
  * Help / Machine Guide
  * Profile
* Added profile access through the top-right avatar/profile button.
* Added local account/profile support through services.
* Added avatar/profile picture display support.
* Added class listing support.
* Added shop/product support.
* Added member journey content, attendance, achievements, and workout-related mock data.
* Added machine guide content and service support.
* Added voucher/payment-style mock data where needed for frontend flows.
* Added gym activity schedule mock data.

## Current Tech Stack

* React Native
* Expo SDK 54
* Expo Router
* TypeScript
* Mock data for the current frontend phase
* Service-layer architecture for future Gmind/backend integration

## Important Project Rules

* Current phase is frontend-only refinement.
* No real backend integration yet.
* Gmind/backend will become the future source of truth.
* Screens must call services only.
* Mock data must stay behind the service layer.
* Do not put admin/staff workflows inside the normal member app.
* The separate mock admin/testing portal is frontend-only and not production security.
* Do not hardcode backend assumptions.
* Keep changes small, clean, and easy to review.
* Run TypeScript checks after changes:

```bash
npx tsc --noEmit
```

## Current Main Folders

* `src/app` - Expo Router routes
* `src/screens` - Screen components
* `src/services` - Backend-ready service layer
* `src/mock` - Temporary frontend mock data
* `src/types` - Shared TypeScript types
* `src/constants` - Theme/constants
* `src/components` - Reusable UI components
* `assets/images` - Marvel Gym and app image assets
* `docs` - Project documentation/progress notes

## Current Status

The app has moved beyond the default Expo starter and now contains the core Marvel Gym member app structure, branded UI, service-layer architecture, mock data, authentication/onboarding flow, tab navigation, profile support, classes, shop, journey, help/machine guide, activity-related data, voucher/payment-related mock content, and a separate mock admin/testing portal.

Current state:

* Advanced frontend/product polish stage.
* UI/UX is approximately 99% complete.
* Main member-facing frontend flows are already built.
* Remaining frontend work is mostly small visual tweaks, wording improvements, and final polish.

## Upcoming Direction

The next major milestones after final UI polish are admin-side content management and real database/backend integration. These are not complete yet.

### Admin / Management Side

The project will need an admin user or admin-side system where staff can modify shared app content used across member accounts.

Admin-managed items may include:

* Welcome page photos
* Gym product listings
* Machine guide content
* Classes
* Pricing
* Membership-related display data
* Other common content shared between accounts

### Database / Backend Connection

After frontend polish, the app will begin connecting to an actual database/backend. Gmind/backend integration remains the long-term source of truth where possible.

The current service-layer architecture should make this easier because screens already call services instead of importing mock data directly. Backend work should replace mock-backed service implementations without requiring major screen rewrites.
