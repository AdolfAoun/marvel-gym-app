# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Marvel Gym App - Codex Instructions

## Project Context

This project is the Marvel Gym mobile application.

Tech stack:
- React Native
- Expo SDK 56
- TypeScript
- Expo Router with routes inside src/app

## Core Rules

- Phase 1 is frontend only.
- Use mock data for now.
- Do not connect to a real backend yet.
- Gmind/backend integration will come later.
- Gmind is the future source of truth.
- This is a members-only app, not an admin app.
- Do not build admin dashboards or staff tools.
- Screens must never import mock data directly.
- Screens must call service-layer functions only.
- Services may use mock data now, but should be backend-ready.
- Do not modify routes/navigation unless explicitly asked.
- Before editing files, explain the proposed changes.
- Keep changes small and easy to review.

## Architecture Rule

The intended data flow is:

Screen → Service → Mock Data

Later, after backend integration:

Screen → Service → Gmind/backend

Screens should not need major rewrites when the backend is added.

## Reference

The full Phase 1 project specification is in:

docs/marvel-gym-spec.md