/**
 * Seed Configuration
 * Centralized settings for database seeding
 */

// April 2026 - Demo timestamps
const DEMO_START_DATE = new Date('2026-04-14');
const DEMO_MONTH_START = new Date('2026-04-01');
const DEMO_MONTH_END = new Date('2026-04-30');

/**
 * Generate dates for demo period (April 2026)
 */
export const seedConfig = {
  // Base dates for consistent seeding
  baseDate: DEMO_START_DATE,
  monthStart: DEMO_MONTH_START,
  monthEnd: DEMO_MONTH_END,

  // Clinic owner user IDs (reserved)
  CLINIC_OWNER_USER_ID: 100,

  // Doctor user IDs (reserved range 1-10)
  DOCTOR_USER_ID_START: 1,
  DOCTOR_USER_ID_END: 10,

  // Patient user IDs (start from 1000)
  PATIENT_USER_ID_START: 1000,

  // Clinic IDs
  CLINIC_ID_START: 1,

  // Branch IDs
  BRANCH_ID_START: 1,

  // Service IDs
  SERVICE_ID_START: 1,

  // Doctor IDs
  DOCTOR_ID_START: 1,

  // Slot IDs
  SLOT_ID_START: 1,

  // Patient (table) IDs
  PATIENT_TABLE_ID_START: 1,

  // Subscription plan IDs (standard)
  SUBSCRIPTION_PLAN_IDS: {
    BASIC: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  },
};

/**
 * Helper: Generate dates spaced in April 2026
 * Useful for creating appointments across different days
 */
export function generateAprilDates(count: number, startDay = 14): Date[] {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const day = Math.min(startDay + i, 30); // Max day in April
    dates.push(new Date(2026, 3, day)); // Month is 0-indexed, so 3 = April
  }
  return dates;
}

/**
 * Helper: Generate time slots (morning and afternoon)
 */
export function generateTimeSlots(): Array<{ start: string; end: string }> {
  const slots = [];
  // Morning: 09:00 - 12:00 (3 slots of 1 hour each)
  for (let hour = 9; hour < 12; hour++) {
    slots.push({
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 1).padStart(2, '0')}:00`,
    });
  }
  // Afternoon: 14:00 - 18:00 (4 slots of 1 hour each)
  for (let hour = 14; hour < 18; hour++) {
    slots.push({
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 1).padStart(2, '0')}:00`,
    });
  }
  return slots;
}

/**
 * Convert HH:MM to minutes for easier calculations
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
