-- Prevent a user from having multiple active appointments at the same date/time,
-- even across different branches or clinics.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_user_datetime_active_unique_idx"
ON "Appointment"("userId", "appointmentDate", "appointmentTime")
WHERE "status" IN ('PENDING', 'CONFIRMED', 'RESCHEDULED', 'PAYMENT_FAILED');
