# DenClinic Implementation Gap Audit

Static source audit of the current repository as of April 24, 2026.

This document focuses on:
- what is actually implemented in code
- what is still missing
- what is present only as schema/demo UI/mock data
- what is risky for a real clinic product

## Implemented Scope

### Real backend/data paths that exist

- The Prisma schema is broad and real: users, patients, guardians, clinics, branches, services, doctors, staff, slots, appointments, payments, ratings, subscriptions, and clinic ownership are modeled in `prisma/schema.prisma`.
- Real Prisma-backed auth exists for login, signup, logout, current-user lookup, forgot/reset password, email-code verification, and email verification routes under `src/app/api/auth/*`.
- Real read APIs exist for clinic discovery and booking inputs:
  - `src/app/api/clinics/route.ts`
  - `src/app/api/clinic/[clinicId]/route.ts`
  - `src/app/api/branch/[branchId]/route.ts`
  - `src/app/api/time-slots/route.ts`
- Real write APIs exist for:
  - creating bookings in `src/app/api/bookings/route.ts`
  - creating payments in `src/app/api/payments/route.ts`
  - marking cash payments paid in `src/app/api/payments/[paymentId]/mark-paid/route.ts`
  - reading user bookings in `src/app/api/users/[userId]/bookings/route.ts`
  - reading patient records in `src/app/api/patient/records/route.ts`
  - reading/updating clinic records in `src/app/api/clinic/records/route.ts` and `src/app/api/clinic/records/[appointmentId]/route.ts`

### Real patient-facing flows that exist

- Clinic discovery is implemented with search, distance sorting, rating sorting, and map/list UI in `src/components/patient/PatientDashboard.tsx`.
- Clinic detail and branch detail pages are wired to real APIs in:
  - `src/app/patient/clinics/[clinicId]/page.tsx`
  - `src/app/patient/branches/[branchId]/page.tsx`
- The booking funnel is implemented in code:
  - service selection
  - doctor filtering
  - time-slot lookup
  - pending booking creation
  - payment step
  - confirmation state
  - files: `src/components/booking/*`, `src/app/patient/booking/page.tsx`
- Patient bookings and patient records pages are wired to authenticated APIs in:
  - `src/app/patient/bookings/page.tsx`
  - `src/app/patient/records/page.tsx`

### Real clinic-ops data surface that exists

- Doctors/staff/owners/admins can read clinic appointment records and patch appointment status, reason-for-visit, and notes through `src/app/api/clinic/records/*`.
- `ClinicRecordsPanel` is the main real operations screen currently mounted at:
  - `src/app/doctor/patients/page.tsx`
  - `src/app/staff/patients/page.tsx`

## Product Gaps

### Family and dependent care are not implemented end-to-end

- The schema supports guardians and “book for someone else” via `PatientGuardian` and `bookedForPatientId`, but the actual booking flow never accepts or writes a dependent target.
- The family pages are local mock CRUD only:
  - `src/app/patient/family/page.tsx`
  - `src/app/patient/family/[memberId]/page.tsx`
- There are no family APIs under `src/app/api/` for listing dependents, creating dependents, or booking on behalf of a dependent.

### Medical records are still shallow

- The patient records API is effectively an appointment ledger, not a real dental record.
- Current “records” are mostly appointment date, status, reason, and notes from `Appointment`.
- Missing structured clinical data:
  - diagnoses
  - procedures per tooth
  - prescriptions
  - treatment plans
  - x-rays/images/files
  - attachments
  - doctor-authored visit notes history
  - audit trail on edits
- The 3D dental chart/detail view is isolated demo UI, not persisted clinical data:
  - `src/app/doctor/patients/[id]/page.tsx`
  - `src/components/model3D/*`

### Ratings and reviews are read-only

- `Rating` exists in Prisma and clinic detail pages display reviews.
- There is no route or UI to create, edit, or delete a clinic review.
- No moderation, anti-spam, or verified-visit review linkage exists.

### Subscription/billing for clinics is schema-only

- `SubscriptionPlan` and `Subscription` exist in Prisma and seed data.
- Missing implementation:
  - subscription plans API
  - clinic subscribe/renew/cancel flows
  - subscription dashboard
  - plan enforcement on doctors/branches/appointments
  - billing history UI
  - renewal jobs/reminders

### Clinic management CRUD is mostly missing

- Clinic/branch/service discovery is implemented as read-only.
- Missing operational CRUD for:
  - clinics
  - branches
  - services
  - doctors
  - staff
  - clinic branding/content
- There are no corresponding create/update/delete route families for those entities under `src/app/api/`.

## Patient Flow Gaps

### Auth gating is inconsistent on patient routes

- `/patient` redirects signed-out users, but many other patient pages rely on client-side layout behavior or render local/default data.
- Anonymous users can move through much of the booking flow and only fail at confirmation/payment time.
- `PatientLayout` does not itself force signin when `user` is missing; it mainly handles active-role redirects.
- Root/auth redirects are also patient-first: `src/app/page.tsx` and `src/app/auth/signin/page.tsx` push users to `/patient` regardless of their actual role, then rely on later client redirects to sort it out.

### Booking lifecycle is incomplete

- Confirmed bookings show `إعادة جدولة` and `إلغاء` actions in `src/app/patient/bookings/page.tsx`, but those buttons do not execute real handlers.
- The only cancel API is `src/app/api/bookings/[bookingId]/cancel/route.ts`, and it only allows canceling `PENDING` bookings.
- There is no patient reschedule API or UI flow.
- There is no waitlist, no partial payment flow, no refund path, and no appointment reminder flow.

### Pending-booking cancellation is incomplete

- Booking creation locks a slot by setting `Slot.isAvailable = false`.
- Canceling a pending booking only flips the appointment to `CANCELLED`; it does not release the slot.
- Slot release exists only in `src/lib/appointments.ts` for expired failed payments and is triggered lazily by reads.
- Result: a canceled payment flow can strand a slot and block reuse.

### Booking amount handling is still rough

- Booking confirmation shows `state.paymentAmount`, which starts at a hardcoded `50` in `BookingContext`.
- The real amount is only returned after the pending booking is created.
- This means the confirmation screen can show the wrong price before the payment step.

### Profile and settings are mostly local state

- Patient profile is largely default/mock data in:
  - `src/app/patient/profile/page.tsx`
  - `src/app/patient/settings/hooks/useSettingsState.ts`
- Edit profile saves only to component-local state and then navigates back.
- Change password page simulates success locally; it does not call a real “change current password” API.
- Notification, language, dark-mode, and help pages are local/static only.
- The dark-mode settings page updates the DOM directly instead of using `ThemeContext`.

### Discovery can degrade into dead ends

- `src/app/api/clinics/route.ts` silently falls back to `MOCK_CLINICS` if DB access fails.
- Clinic detail and branch detail routes do not fall back in the same way.
- Result: users can browse a fake clinic list that may not resolve into real clinic/branch detail or booking data.

## Doctor And Staff Operation Gaps

### Doctor surfaces are mostly demo UI

- `src/components/doctor/DoctorDashboard.tsx` is hardcoded stats and appointments.
- `src/components/doctor/AppointmentsSchedule.tsx` mutates local arrays only.
- `src/components/doctor/TimeSlotManager.tsx` edits local periods only; it is not connected to real slot management.
- `src/components/doctor/messages/MessagesPanel.tsx` is static mock messaging.
- `src/components/doctor/reports/ReportsPanel.tsx` is static analytics with no backend fetch or export implementation.
- `src/components/doctor/settings/*` only edits local component state and shows success toasts.

### Staff surfaces are mostly demo UI

- `src/components/staff/StaffDashboard.tsx` is driven by `mockTodayAppointments`.
- `src/components/staff/appointments/StaffAppointmentsPanel.tsx` is local mock scheduling only.
- `src/components/staff/payments/StaffPaymentsPanel.tsx` is local mock payments only.
- `src/components/staff/lab/StaffLabPanel.tsx` is local mock lab case management only.
- `src/components/staff/settings/StaffSettingsPanel.tsx` is local settings state only.
- `src/app/staff/messages/page.tsx` does not implement messaging; it redirects back to `/staff`.

### Patient management is misaligned with the mounted UI

- `src/app/doctor/patients/page.tsx` and `src/app/staff/patients/page.tsx` both mount `ClinicRecordsPanel`.
- `ClinicRecordsPanel` is useful for appointment records, but it is not a patient registry/CRUD screen.
- A fuller staff patient panel exists in `src/components/staff/patients/StaffPatientsPanel.tsx`, but it is not mounted.
- A doctor patient list/detail demo exists in `src/components/doctor/PatientRecordsView.tsx`, but it is not mounted.
- `src/app/doctor/patients/[id]/page.tsx` uses mock patient and tooth data.

### Staff navigation has a broken patient-detail handoff

- `ClinicRecordsPanel` links to `/doctor/patients/{id}` even when it is rendered under `/staff/patients`.
- `DoctorLayout` redirects active `STAFF` users away from doctor routes.
- Result: staff can be routed into a path their active layout will reject.

### Clinic scheduling is only partially real

- Patients can consume real `Slot` data through the booking flow.
- Doctors cannot actually manage those slots through real create/update/delete APIs.
- The repo only has read-only slot lookup (`/api/time-slots`) plus the patient booking write path.

## Admin And Clinic Owner Gaps

### Admin/owner areas are not implemented as real products

- Account switching and role layouts point to `/admin` and `/manage`, but those areas are absent or incomplete.
- There is no `/admin` app area.
- `/manage` has only a placeholder shell at `src/app/manage/patients/page.tsx`.
- There is no owner dashboard, no clinic-owner settings area, no subscription center, and no branch/service/doctor/staff management console.

### Role onboarding is incomplete

- The signup contract accepts `PATIENT` or `DOCTOR`.
- The backend signup route ignores the role and always creates a patient profile under the default patient role.
- There is no onboarding flow for:
  - doctor accounts
  - staff accounts
  - clinic owners
  - admin users

## Auth, Security, Privacy, And Compliance Gaps

### Google auth is not safe

- `src/app/api/auth/google/route.ts` only base64-decodes the token payload and checks `exp`.
- It explicitly does not verify the Google signature.
- This is still demo-grade and unsafe for real authentication.

### Sensitive data is exposed publicly

- `GET /api/bookings` is unauthenticated and returns all appointments.
- `GET /api/test` is unauthenticated and returns a live user count.
- For a clinic product, both are privacy/compliance issues.

### Access control is too broad

- Doctors are scoped to the whole clinic for clinic-record reads/edits, not obviously limited to their own appointments/patients.
- `POST /api/payments/[paymentId]/mark-paid` checks role only and does not verify clinic/branch ownership of the payment.
- There is no central server middleware layer; most route protection is per-handler and most page protection is client-side redirect logic.

### Secrets and env safety are weak

- `JWT_SECRET` and `USERNAME_ENCRYPTION_KEY` have hardcoded fallback defaults in `src/lib/auth.ts`.
- `src/lib/env.ts` does not require real auth secrets for startup.
- A misconfigured production deploy would still boot in an unsafe state.

### Verification/reset/OTP flows are not production-ready

- Reset/verification/OTP data is stored in process memory only via `src/lib/tokenStorage.ts`.
- Cleanup exists but is not visibly scheduled or enforced.
- Reset tokens are generated with `Math.random()`.
- When email delivery is not configured, OTPs and verification/reset links are logged to stdout.
- This breaks across multiple instances and leaks secrets into logs.

### Enumeration and abuse protections are missing

- Public helper endpoints disclose whether usernames, national IDs, and emails exist:
  - `src/app/api/auth/check-username/route.ts`
  - `src/app/api/auth/check-national-id/route.ts`
  - `src/app/api/auth/send-email-code/route.ts`
- There is no visible throttling, rate limiting, lockout, or abuse protection on:
  - login
  - OTP send/verify
  - forgot password
  - Google auth

### PWA caching is unsafe for clinic data

- The generated service worker caches same-origin `GET /api/*` responses except `/api/auth/*`.
- That creates real privacy risk for patient/clinic data on shared devices.
- The current PWA posture is not safe for PHI-sensitive data until API caching rules are narrowed.

## Data Model And Domain Consistency Gaps

### Schema breadth exceeds implemented behavior

- `PatientGuardian`, `Rating`, `SubscriptionPlan`, `Subscription`, and `Staff` are all modeled, but large parts of their real workflows are missing.
- The schema advertises a more complete product than the route/UI layer currently delivers.

### Email verification flow is internally inconsistent

- If email is not pre-verified through the OTP flow, signup stores `email: undefined`.
- The response/message can still imply later verification is possible.
- Later verification/reset flows depend on having a stored email and token state.

### Identity consistency is weak

- `phoneNumber` is not unique in `User`, even though it is treated like an identity field in docs and UX.
- Username is encrypted, but the encryption key also has a hardcoded fallback.

### Role switching is only partially implemented

- `AuthContext` supports `activeRole`, but the main sidebars and bottom nav infer menu state from `user.roles[0]`, not `activeRole`.
- Result: switching roles does not fully change navigation behavior and can feel inconsistent.
- Account-switch targets for `ADMIN` and `CLINIC_OWNER` point to app areas that are not actually implemented as full products.

### Currency and locale are inconsistent

- Prisma defaults payment currency to `EGP`.
- Booking/payment APIs emit `LYD`.
- Staff payment/lab/patient balances render `₪`.
- Content and seed/demo defaults also mix Cairo/Egypt, Riyadh/Saudi, and Ramallah/Nablus/Hebron contexts across screens.
- The app does not yet have a single clinic-market locale strategy.

## Legacy And Dead-End Surface Area

### Placeholder shells still exist

- The repo still contains top-level placeholder shells at:
  - `src/app/appointments/page.tsx`
  - `src/app/messages/page.tsx`
  - `src/app/reports/page.tsx`
  - `src/app/settings/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/manage/patients/page.tsx`
- These create noise and imply product areas that are not truly implemented.

### Unmounted or redundant components exist

- `src/components/staff/patients/StaffPatientsPanel.tsx` exists but is not used.
- `src/components/doctor/PatientRecordsView.tsx` exists but is not used.
- `src/config/doctorMenuItems.ts` exists, but the main sidebar uses `src/config/menuItems.ts`.
- The codebase mixes current flows, legacy placeholders, and unused alternatives.

## Testing, Operations, And Deployment Gaps

### Automated test coverage is effectively absent

- `package.json` has a `test:api:records` script pointing to `tests/records-api.integration.ts`.
- There is no `tests/` directory in the repo.
- There is no checked-in Jest/Vitest/Playwright configuration.
- Markdown test reports exist, but the repository itself does not ship meaningful automated coverage.
- Even the one declared test path is currently broken at the repository level because the referenced file tree does not exist.

### Deployment setup is thin

- `docker-compose.yml` only provisions Postgres and uses hardcoded dev credentials.
- There is no app container spec.
- There is no `.env.example` describing required secrets/contracts.
- README still instructs destructive local migration reset because migration history was broken/rebased.

### Production mode still mixes demo behaviors

- `/api/clinics` can silently serve mock clinics.
- `/api/dev/*` mock endpoints remain in the repo and are only disabled by `NODE_ENV === 'production'`.
- Multiple staff/doctor/patient surfaces still render fake operational data directly in real pages.

### PWA setup is incomplete even before privacy tightening

- PWA assets/config exist, but the repo still lacks a fully production-safe posture:
  - icon/screenshot gaps are documented in `PWA_TESTING_REPORT.md`
  - current service-worker behavior is too broad for medical data

## Highest-Priority Missing Work

### Must complete before a real clinic rollout

- Replace demo-grade Google auth with real signature verification.
- Remove public appointment/test data exposure.
- Add proper clinic/branch-scoped authorization for payment and records actions.
- Stop caching sensitive API data in the PWA service worker.
- Persist verification/reset tokens outside process memory and add abuse controls.
- Implement real slot management and slot release on cancel.
- Implement real patient profile/settings persistence.
- Build real staff/doctor operational screens on top of the existing APIs.
- Implement family/dependent booking properly.
- Add real clinic admin/owner/subscription workflows.
- Add automated tests for auth, booking, payments, and records.

## Overall Assessment

- The repo is past the “UI sketch” stage.
- The patient booking/payment path and clinic record APIs are the strongest real implementation areas.
- Most doctor/staff/admin/owner surfaces are still demo-level.
- Several schema features exist without real workflows.
- The codebase is demo-capable, but not production-ready for a clinic environment until security/privacy, operational tooling, and workflow completeness are substantially tightened.
