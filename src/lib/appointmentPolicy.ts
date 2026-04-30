export const APPOINTMENT_POLICY = {
  refundWindowHours: 6,
} as const;

function getAppointmentStart(appointmentDate: Date, appointmentTime: string): Date {
  const [hours, minutes] = appointmentTime.split(':').map((value) => Number(value));

  const start = new Date(appointmentDate);
  start.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return start;
}

export function getHoursUntilAppointment(
  appointmentDate: Date,
  appointmentTime: string,
  now: Date = new Date()
): number {
  const start = getAppointmentStart(appointmentDate, appointmentTime);
  return (start.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function evaluateAppointmentPolicy(
  appointmentDate: Date,
  appointmentTime: string,
  now: Date = new Date()
) {
  const hoursRemaining = getHoursUntilAppointment(appointmentDate, appointmentTime, now);
  const hasStarted = hoursRemaining <= 0;
  const canRefund = hoursRemaining >= APPOINTMENT_POLICY.refundWindowHours;
  const canReschedule = hoursRemaining >= APPOINTMENT_POLICY.refundWindowHours;

  return {
    hoursRemaining,
    hasStarted,
    canRefund,
    canReschedule,
    refundWindowHours: APPOINTMENT_POLICY.refundWindowHours,
  };
}
