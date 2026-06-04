# Marvel Gym Project Progress Summary

This document captures the current state of the Marvel Gym mobile application so another developer, ChatGPT, or Codex can resume development without prior conversation context.

## Project Overview

Marvel Gym is a members-only mobile application for gym members. The current application is built with:

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Phase 1 frontend-only architecture
- Mock data as the temporary data source
- Future Gmind/backend integration as the eventual source of truth

The product is not an admin app. It should focus on member-facing workflows such as login, memberships, class access, store purchases, payment history, notifications, and profile management.

The architecture philosophy is to keep UI screens insulated from backend implementation details. Screens should call service-layer functions only. Services can use mock data during Phase 1, then later be replaced with real Gmind/backend API calls without forcing major screen rewrites.

## Current Architecture

The intended Phase 1 data flow is:

```text
Screen -> Service -> Mock Data
```

The future backend data flow is:

```text
Screen -> Service -> Gmind Backend
```

Screens must never import mock data directly. This is an important project rule. Mock data is allowed only behind service-layer functions so the backend migration can happen mostly inside `src/services`.

## Environment Status

- Expo SDK 54 is installed through `expo ~54.0.0`.
- React Native version is `0.81.5`.
- React version is `19.1.0`.
- Expo Router is configured as the app entry through `main: "expo-router/entry"`.
- Expo Go has been tested successfully on iPhone.
- The project runs successfully after the SDK 54 cleanup.
- `npx tsc --noEmit` currently passes.
- GitHub is connected for the project.
- Current Git working tree has local changes, especially the polished `src/screens/LoginScreen.tsx`.

## Folder Structure

Important project folders:

- `src/app`: Expo Router route files. This is the active routing folder.
- `src/app/(tabs)`: Bottom-tab route group for the main member app.
- `src/screens`: Screen components. Route files should stay thin and render screens from here.
- `src/services`: Service layer. Screens call these functions instead of importing mock data.
- `src/mock`: Temporary Phase 1 mock data.
- `src/types`: Shared TypeScript models.
- `src/components`: Reusable UI components. Currently mostly reserved for future shared components.
- `src/context`: Reserved for future React context state.
- `src/utils`: Reserved for future utility helpers.
- `src/constants`: Shared constants such as theme values.
- `assets/images`: Image assets, including the Marvel Gym transparent logo used on the login screen.
- `docs`: Project documentation and specifications.

Expo starter/template files that conflicted with SDK 54 were cleaned up. The app is now focused on Marvel Gym routes and screens.

## Completed Type Models

The shared models are defined in `src/types/index.ts`.

Implemented core types:

- `Member`
- `MembershipStatus`
- `PaymentMethod`
- `PaymentStatus`
- `NotificationType`
- `MembershipPlan`
- `Membership`
- `GymClass`
- `Product`
- `Payment`
- `AppNotification`

Membership statuses currently supported:

- `Active`
- `Expired`
- `Frozen`
- `Suspended`
- `Pending Approval`

Payment methods currently supported:

- `Visa`
- `Mastercard`
- `Whish Money`
- `Pay at Counter`

## Completed Service Layer

All service functions return Promises to simulate future API calls. They currently return mock data, but are shaped to be replaced with Gmind/backend calls later.

### `src/services/authService.ts`

- `registerMember(input)`
- `loginMember(input)`
- `logoutMember()`

Current note: `loginMember` accepts an object typed as `{ email: string; password: string }`. The login screen uses this same field for either normalized phone digits or normalized email because backend integration is not implemented yet.

### `src/services/memberService.ts`

- `getCurrentMember()`
- `updateProfile(updates)`

### `src/services/membershipService.ts`

- `getMembershipStatus()`
- `getMembershipPlans()`
- `activateMembership(planId)`
- `freezeMembership()`
- `unfreezeMembership()`
- `payMembership(method)`
- `showQRCode()`

Important rule: `showQRCode()` returns a QR value only when `activeMembership.status` is `Active`. Otherwise it returns `undefined`.

### `src/services/classService.ts`

- `getScheduledClasses()`
- `registerForClass(classId)`
- `cancelClassRegistration(classId)`

### `src/services/productService.ts`

- `getProducts()`
- `buyProduct(productId, method)`

### `src/services/paymentService.ts`

- `getPaymentHistory()`

### `src/services/notificationService.ts`

- `getNotifications()`
- `markNotificationAsRead(notificationId)`

### `src/services/index.ts`

Exports all services from one barrel file so screens can import from `@/services`.

## Navigation Status

The project uses Expo Router with routes inside `src/app`.

Current route structure:

```text
src/app/_layout.tsx
src/app/index.tsx
src/app/login.tsx
src/app/(tabs)/_layout.tsx
src/app/(tabs)/index.tsx
src/app/(tabs)/membership.tsx
src/app/(tabs)/classes.tsx
src/app/(tabs)/store.tsx
src/app/(tabs)/profile.tsx
```

Root layout:

- Uses `Stack` from `expo-router`.
- Uses `ThemeProvider`, `DarkTheme`, and `DefaultTheme` from `@react-navigation/native`.
- Uses `useColorScheme` from `react-native`.
- Defines `login` and `(tabs)` stack screens with headers hidden.
- No custom splash overlay is currently rendered because it caused an SDK 54 render issue.

Startup flow:

- `src/app/index.tsx` redirects `/` to `/login`.
- `src/app/login.tsx` renders `LoginScreen`.
- After login or guest access, the screen navigates to `/(tabs)`.

Bottom tabs:

- `Home`
- `Membership`
- `Classes`
- `Store`
- `Profile`

The tab route files are intentionally thin wrappers that render matching screen files from `src/screens`.

## Screen Status

Placeholder screens exist for:

- `HomeScreen`
- `MembershipScreen`
- `ClassesScreen`
- `StoreScreen`
- `ProfileScreen`

These are navigation skeleton screens only. They should not yet contain detailed dashboard cards or real data flows. Future screen work should call services, never mock data directly.

## Login Screen

`src/screens/LoginScreen.tsx` is the most polished screen currently implemented.

### Branding

- Uses the Marvel Gym visual brand.
- Uses `assets/images/marvel-logo-transparent.png`.
- Logo has transparent outer area, black inner area, and red Marvel Gym artwork/text.
- Theme is red, black, and white.
- Primary accent color is `#E11D2E`.
- The older blue theme was removed.

Removed branding elements:

- Plain `Marvel Gym` text heading
- `Stronger Every Day`
- Custom React Native logo badge
- Image versions with visible white background

### Layout

The login screen is designed as a premium mobile-first portrait screen.

Current layout characteristics:

- Fixed layout
- Non-scrollable in normal state
- Safe area support through `SafeAreaView`
- Centered phone-like frame on web
- Full natural screen width on iOS/Android
- Matte black/deep charcoal background
- Red glow accents
- Liquid-glass inspired translucent card styling
- Fixed-height login card
- Stable layout when switching between phone and email login
- No keyboard-induced upward layout shift
- Tapping outside text inputs dismisses the keyboard
- Feedback messages use an overlay and do not reserve layout space

The main composition is moved upward through `styles.fixedContent`:

```ts
transform: [{ translateY: -30 }]
```

This shifts the logo, subtitle, login card, and bottom actions together without changing the login card height.

### Authentication Modes

Phone login is the default mode.

Phone login:

- Lebanon only for now.
- Country code selector visually shows `+961`.
- Country picker is not implemented yet.
- User enters only the local 8 digits after `+961`.
- Input allows digits only.
- Input display format is:

```text
XX XXX XXX
```

Example:

```text
70123456 -> 70 123 456
```

Email login:

- Available through a small toggle.
- Toggle text:
  - Phone mode: `Use email instead`
  - Email mode: `Use phone instead`
- Email is an optional alternative login method.
- Product rule: email login works only when the email address is linked to exactly one account/phone number.
- Backend uniqueness and account-link validation will be enforced later.

### Login Behavior

When logging in:

- Phone mode sends normalized phone digits without spaces.
- Email mode sends a trimmed lowercase email value.
- Password behavior remains unchanged.
- `authService.loginMember()` is the only service called by login.
- Successful login navigates to `/(tabs)`.
- Continue as Guest also navigates to `/(tabs)`.

### Validation Rules

Phone mode:

- Phone number must contain exactly 8 digits after `+961`.
- If invalid, show:

```text
Enter an 8-digit phone number.
```

Email mode:

- Uses a basic frontend email format check.
- Format must include text before `@`, text after `@`, and a dot after `@`.
- If invalid, show:

```text
Enter a valid email address.
```

Password:

- Required.
- If empty, show:

```text
Enter your password.
```

Credential failure after valid formats:

Phone mode:

```text
Phone number or password is invalid.
```

Email mode:

```text
Email or password is invalid.
```

Security rationale:

- The app should not reveal whether a phone number or email exists.
- Generic credential errors are used only after format validation passes.
- Account existence should remain private.

### Feedback System

The login screen has an animated contextual feedback pill:

- Appears near the forgot-password/login area.
- Uses `Animated.Value` opacity.
- Fades in and out smoothly.
- Auto-hides after about 2.5 seconds.
- Uses absolute positioning inside the login card.
- Does not reserve layout space.
- Does not shift the UI.
- Matches the Marvel Gym red/black premium theme.

Current feedback messages:

- Forgot Password: `Password reset email sent`
- Create Account: `Registration coming soon`
- Phone format: `Enter an 8-digit phone number.`
- Email format: `Enter a valid email address.`
- Empty password: `Enter your password.`
- Phone credentials: `Phone number or password is invalid.`
- Email credentials: `Email or password is invalid.`

### Current Login Actions

Current visible actions:

- Login
- Forgot Password
- Create Account
- Continue as Guest

Placeholder behavior:

- Forgot Password shows `Password reset email sent`.
- Create Account shows `Registration coming soon`.
- Continue as Guest navigates to `/(tabs)`.

Removed actions:

- Remember Me
- Face ID
- QR Access
- Chat with us

## UI Decisions

Major decisions made so far:

- The user-facing brand is Marvel Gym. Gmind is only the future backend/source of truth.
- The login screen uses Marvel Gym red/white/black branding instead of the earlier blue/black theme.
- The login screen should feel like a premium mobile app, not a stretched desktop webpage.
- Web preview is constrained to a phone-like max-width frame.
- Native iOS/Android use the full screen naturally.
- The screen uses a fixed layout so the design feels intentional and stable.
- Always-scrollable behavior was removed from login.
- Keyboard opening should not shift the login layout because inputs are already high enough.
- Tapping anywhere outside active text inputs should dismiss the keyboard without breaking buttons.
- Feedback messages are contextual overlays, not inline status areas, to prevent layout movement.
- Phone login is primary because members are expected to be identified by phone number.
- Email login is optional and secondary.
- QR access is not shown before login because it belongs to the authenticated membership flow.
- Face ID is not manually implemented in Phase 1; system autofill or password manager behavior can handle this later.
- Chat with us was removed from the login screen to preserve stable spacing and because support chat is not implemented yet.

## Membership Rules

Current membership-related rules:

- The current mock data has one active membership linked to the current member.
- Membership plans include 1 month, 3 months, 6 months, and 12 months.
- Each plan includes `durationInMonths`, `durationInDays`, price, currency, and active status.
- QR code access is available only for active memberships.
- `membershipService.showQRCode()` returns `undefined` for non-active memberships.
- Membership statuses are:
  - `Active`
  - `Expired`
  - `Frozen`
  - `Suspended`
  - `Pending Approval`
- Freeze logic currently returns a mock frozen membership with `frozenUntil`.
- Unfreeze logic returns an active membership and clears `frozenUntil`.
- Pending Approval is supported in the type system for future flows, such as pay-at-counter or backend approval workflows.

## Current Mock Architecture

Mock data lives in `src/mock/index.ts`.

Current mock datasets:

- `currentMember`: one member record.
- `membershipPlans`: 1, 3, 6, and 12 month plans.
- `activeMembership`: one active membership linked to the current member.
- `gymClasses`: scheduled classes with a mix of:
  - Available classes
  - Full classes
  - Free classes
  - Paid classes
  - Registered and unregistered examples
- `products`: store products such as:
  - Water
  - Energy Drink
  - Protein Bar
  - Whey Protein
- `paymentHistory`: mock payments for membership, product, and class purchases.
- `appNotifications`: mock notifications for:
  - Membership activated
  - Payment confirmed
  - Class registration confirmed
  - Membership expiring soon

Mock data is simple and realistic enough for frontend development, but it should stay easy to replace later.

## Git Status

Recommended commit checkpoints reached so far:

- Initial Marvel Gym folder structure under `src`.
- Core TypeScript models in `src/types/index.ts`.
- Mock data in `src/mock/index.ts`.
- Service layer in `src/services`.
- Expo Router tab navigation skeleton.
- Root redirect to login startup flow.
- SDK 54 cleanup and removal of incompatible starter files.
- Login screen route and premium login UI.
- Transparent Marvel Gym logo asset integration.
- Phone-first login with optional email mode.
- Login validation and contextual feedback system.
- Fixed, non-scrollable login layout with keyboard-dismiss behavior.
- Final login cleanup and positioning polish.
- Current progress summary document.

Before committing, review the working tree because `src/screens/LoginScreen.tsx` has local polished changes and this document is newly added.

## Recommended Next Steps

1. Registration Screen

Create a member registration screen using the same red/black premium design language. Keep it frontend-only and route through `authService.registerMember()`.

2. Home Dashboard

Build the main member dashboard using service calls. Suggested summary cards: membership status, next class, unread notifications, and quick access to membership QR if active.

3. Membership Screen

Build membership status display, plan list, activation/payment placeholder flow, freeze/unfreeze actions, and expiration messaging.

4. QR Screen

Create an authenticated QR access screen. It should call `membershipService.showQRCode()` and show QR access only when membership is active.

5. Classes

Build scheduled classes UI using `classService.getScheduledClasses()`. Include available/full status, free/paid labels, and register/cancel placeholders.

6. Store

Build product listing using `productService.getProducts()`. Product purchases should call `productService.buyProduct()` and stay frontend-only.

7. Payment History

Build payment history UI from `paymentService.getPaymentHistory()`. Keep fields simple for Phase 1.

8. Profile

Build member profile UI from `memberService.getCurrentMember()` and profile update placeholders through `memberService.updateProfile()`.

9. Backend Integration Later

Replace mock-backed service implementations with Gmind/backend API calls. Preserve screen imports and function names where possible so UI screens do not need major rewrites.

## Handoff Notes

- Do not let screens import from `src/mock`.
- Do not add admin dashboards or staff workflows.
- Do not add attendance history or workout tracking unless the product scope changes.
- Keep Phase 1 frontend-only until backend integration is explicitly requested.
- Keep changes small and easy to review.
- Before editing files, explain proposed changes.
- Run `npx tsc --noEmit` after code changes.
