# Codex Handoff Summary

This note captures where the Marvel Gym app currently stands so future Codex sessions can quickly regain context.

## Project State

Marvel Gym App is a React Native mobile app built with Expo SDK 54, Expo Router, and TypeScript.

The project is currently in an advanced frontend/product polish stage. The main member-facing frontend flows are already built, and the UI/UX is approximately 99% complete. Remaining frontend work should mostly be small visual tweaks, wording improvements, cleanup, and final polish.

The next major milestones after frontend polish are admin-side content management, real database/backend integration, and future Gmind/backend synchronization. Gmind is expected to become the future source of truth where possible.

## Critical Rules

- Before writing code, read the exact Expo SDK 54 docs: https://docs.expo.dev/versions/v54.0.0/
- Phase 1 is frontend-only.
- Use mock data for now.
- Do not connect a real backend yet.
- Screens must never import mock data directly.
- Screens must call service-layer functions only.
- Services may use mock data now, but should stay backend-ready.
- Keep the normal app member-facing.
- Do not put admin dashboards or staff tools inside the member tabs.
- A separate frontend-only mock admin/testing area may exist for planning/demo.
- Production admin permissions and shared content management are future backend milestones.
- Do not modify navigation/routes unless explicitly asked.
- Keep changes small and easy to review.
- Before editing files, explain the proposed changes.
- After code changes, run `npx tsc --noEmit`.

## Architecture

Current data flow:

```text
Screen -> Service -> Mock Data
```

Future backend flow:

```text
Screen -> Service -> Gmind/backend
```

The goal is that backend integration later happens mostly inside `src/services`, without major screen rewrites.

## Tech Stack

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- React 19
- React Native 0.81
- Mock data
- Service-layer architecture
- Local account/profile mock persistence

## Main Structure

- `src/app` - Expo Router route files.
- `src/app/(tabs)` - Main member-facing bottom tab app.
- `src/app/admin` - Separate frontend-only mock admin/testing portal.
- `src/screens` - Screen components.
- `src/services` - Backend-ready service layer.
- `src/mock` - Temporary Phase 1 mock data.
- `src/types` - Shared TypeScript models.
- `src/constants` - Theme and shared constants.
- `src/components` - Reusable UI components.
- `assets/images` - Marvel Gym branding and visual assets.
- `docs` - Project notes/progress docs.

Note: the project instructions mention `docs/marvel-gym-spec.md`, but in the current workspace the spec file exists at the project root as `marvel-gym-spec.md`.

## Current Routes

Root routes include:

- `/`
- `/welcome`
- `/login`
- `/create-account`
- `/profile`
- `/machine-guide`
- `/how-to-use`
- `/(tabs)`
- `/admin`

Main member tab routes:

- `/(tabs)/index` - Home.
- `/(tabs)/classes` - Classes.
- `/(tabs)/shop` - Gym Shop.
- `/(tabs)/journey` - Journey.
- `/(tabs)/help` - Help, currently hidden from the tab bar with `href: null`.

Admin mock/testing routes:

- `/admin`
- `/admin/members`
- `/admin/classes`
- `/admin/products`
- `/admin/photos`
- `/admin/vouchers`
- `/admin/student-verification`

The admin area is frontend-only and separate from the member tabs.

## What Has Been Built

- Marvel Gym branded startup/loading screen.
- Welcome screen.
- Login screen.
- Create account screen.
- Main tab navigation.
- Home screen.
- Classes screen.
- Gym Shop screen.
- Journey screen.
- Help/machine guide flow.
- Profile screen.
- Top-right profile/avatar button in the tab header.
- Local account registration/login support through services.
- Avatar/profile picture display support.
- Class listing and mock class management support.
- Product/shop support.
- Vouchers/payment-style mock flows.
- Gym activity mock data.
- Journey/attendance/achievement mock data.
- Machine guide content.
- Student verification mock flow.
- Separate mock admin/testing management screens.

## Services

Service files in `src/services` include:

- `authService.ts`
- `localAccountStore.ts`
- `memberService.ts`
- `avatarService.ts`
- `membershipService.ts`
- `classService.ts`
- `productService.ts`
- `notificationService.ts`
- `activityService.ts`
- `voucherService.ts`
- `journeyService.ts`
- `machineGuideService.ts`
- `entryContentService.ts`
- `adminMemberService.ts`
- `studentVerificationService.ts`

Services are exported through `src/services/index.ts`.

Screens should import from `@/services`, not directly from `src/mock`.

## Shared Types

Shared models live in `src/types/index.ts`.

Important type areas include members, memberships, membership plans, membership statuses, payments, notifications, gym classes, products, product categories, gym activity levels, vouchers, journey profile/stats/history, attendance days, achievements, machine guides, and student verification requests.

Current membership statuses:

- `Active`
- `Expired`
- `Frozen`
- `Suspended`
- `Pending Approval`

Current payment method type is simplified to `Cash`.

This differs from the broader product/spec idea of Visa, Mastercard, Whish Money, and Pay at Counter. Treat payment expansion as future backend/product work unless explicitly requested.

## Branding And UI Direction

The app uses a premium Marvel Gym visual identity:

- Red, black, charcoal, and white theme.
- Marvel Gym image assets.
- Premium mobile-first visual design.
- Polished startup and authentication flow.
- Member-facing experience should feel like a real gym app, not an admin tool.

Keep polish changes small and consistent with the existing design. The app is already near final frontend polish.

## Member App Scope

The member app should focus on login/register, home dashboard, membership visibility, QR/access-related membership flow, classes, gym shop, profile, journey/activity, help/machine guide, in-app notifications or status messages, and vouchers/reservations where relevant.

Avoid adding unless explicitly requested:

- Staff tools inside member tabs.
- Production admin permissions.
- Real backend calls.
- Workout tracking beyond the currently mocked Journey concept.
- Trainer booking.
- Database assumptions.

## Admin Mock Portal

A separate frontend-only mock admin/testing area exists under `src/app/admin`.

It currently supports planning/demo style management for things like members, classes, products, welcome photos, vouchers, and student verification.

This is not production admin security. It is a frontend mock/testing portal only. Future backend/admin work should decide how real permissions, staff roles, and shared content management work.

## Useful Docs

- `AGENTS.md` - current Codex/project instructions.
- `README.md` - current progress summary.
- `docs/PROJECT_PROGRESS_SUMMARY.md` - older but detailed handoff summary.
- `marvel-gym-spec.md` - Phase 1 product specification.
- `docs/CODEX_HANDOFF.md` - this file.

The `README.md` appears more current than `docs/PROJECT_PROGRESS_SUMMARY.md` in some areas because the app now includes more completed flows than the older progress doc describes.

## Git Status At Creation

When this handoff was created, `git status --short` showed a clean working tree before adding this document and the README pointer.

## Recommended Next Work

Short-term:

- Final visual polish.
- Wording cleanup.
- Small responsiveness fixes.
- Confirm TypeScript passes after code changes.
- Avoid large refactors unless necessary.

Next major phases:

1. Admin-side content management planning.
2. Real backend/database integration.
3. Gmind/backend synchronization.
4. Replace mock-backed services with real API calls while preserving screen imports and service function names.

## Reminder For Future Codex

Do not rewrite the app from scratch.

Read existing files first, follow current patterns, and make small focused changes. The project is already mostly complete on the frontend. Preserve the service-layer architecture, keep screens backend-agnostic, and only touch routes/navigation when the user explicitly asks.
