# Appointment Cancellation and Rescheduling Policy

## Purpose
This policy defines rules for appointment cancellation and rescheduling, including refund eligibility.

## Rules
1. Patients can cancel appointments only if the appointment has not started yet.
2. Patients can reschedule appointments only when there are at least 6 hours remaining before the current appointment time.
3. Refunds are available only when cancellation is made at least 6 hours before appointment time.
4. If less than 6 hours remain before the appointment, cancellation is still allowed, but funds are not refundable.

## Payment Handling on Cancellation
- Completed online/card payment:
  - 6 hours or more remaining: payment status becomes `REFUNDED`.
  - Less than 6 hours remaining: payment status becomes `CANCELLED` (no refund).
- Pending cash payment: payment status becomes `CANCELLED`.

## Technical Notes
- The policy window is configured in code as `refundWindowHours = 6` in [src/lib/appointmentPolicy.ts](src/lib/appointmentPolicy.ts).
- On cancellation or rescheduling, the previously reserved slot is released and marked available.
