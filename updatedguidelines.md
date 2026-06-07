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