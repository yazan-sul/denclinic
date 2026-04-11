/**
 * Validation schemas for API endpoints
 * Using Zod for schema validation
 */

import { z } from 'zod';

/**
 * Validate that a value is a positive integer
 */
export function validatePositiveInt(value: unknown, fieldName: string): number {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : (value as number);
  
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  
  return num;
}

/**
 * Validate that a string is in ISO date format (YYYY-MM-DD)
 */
export function validateDate(value: unknown, fieldName: string): string {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  
  const str = String(value);
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  
  if (!dateRegex.test(str)) {
    throw new Error(`${fieldName} must be in ISO date format (YYYY-MM-DD or ISO 8601)`);
  }
  
  // Try to parse to ensure validity
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  
  return str;
}

/**
 * Validate that a string is not empty and within length limits
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): string {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  
  const str = String(value).trim();
  
  if (str.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  const minLength = options?.minLength || 1;
  const maxLength = options?.maxLength || 1000;
  
  if (str.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (str.length > maxLength) {
    throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
  }
  
  return str;
}

/**
 * Validate query parameters for time slots endpoint
 */
export function validateTimeSlotsParams(params: {
  branchId?: string;
  doctorId?: string;
  date?: string;
}) {
  try {
    const branchId = validatePositiveInt(params.branchId, 'branchId');
    const date = validateDate(params.date, 'date');
    
    const doctorId = params.doctorId
      ? validatePositiveInt(params.doctorId, 'doctorId')
      : undefined;
    
    return { branchId, date, doctorId };
  } catch (error) {
    throw error;
  }
}

/**
 * Validate booking creation request body
 */
export function validateBookingBody(body: any) {
  try {
    const userId = validatePositiveInt(body.userId, 'userId');
    const clinicId = validatePositiveInt(body.clinicId, 'clinicId');
    const branchId = validatePositiveInt(body.branchId, 'branchId');
    const doctorId = validatePositiveInt(body.doctorId, 'doctorId');
    const serviceId = validatePositiveInt(body.serviceId, 'serviceId');
    const timeSlotId = validatePositiveInt(body.timeSlotId, 'timeSlotId');
    
    return {
      userId,
      clinicId,
      branchId,
      doctorId,
      serviceId,
      timeSlotId,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Validate branch ID parameter
 */
export function validateBranchId(params: { branchId?: string }) {
  try {
    return validatePositiveInt(params.branchId, 'branchId');
  } catch (error) {
    throw error;
  }
}

/**
 * Validate clinic ID parameter
 */
export function validateClinicId(params: { clinicId?: string }) {
  try {
    return validatePositiveInt(params.clinicId, 'clinicId');
  } catch (error) {
    throw error;
  }
}

/**
 * Validate user ID parameter
 */
export function validateUserId(params: { userId?: string }) {
  try {
    return validatePositiveInt(params.userId, 'userId');
  } catch (error) {
    throw error;
  }
}

// ============================================
// Zod Validation Schemas
// ============================================

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Signup request validation schema
 */
export const signupSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون 2 أحرف على الأقل').max(100),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phoneNumber: z.string().regex(/^\d{10,}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
  role: z.enum(['PATIENT', 'DOCTOR']).optional().default('PATIENT'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Booking request validation schema
 */
export const bookingSchema = z.object({
  userId: z.coerce.number().int().positive('معرف المستخدم غير صحيح'),
  clinicId: z.coerce.number().int().positive('معرف العيادة غير صحيح'),
  branchId: z.coerce.number().int().positive('معرف الفرع غير صحيح'),
  doctorId: z.coerce.number().int().positive('معرف الطبيب غير صحيح'),
  serviceId: z.coerce.number().int().positive('معرف الخدمة غير صحيح'),
  appointmentDate: z.string().datetime('تاريخ الموعد غير صحيح'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'وقت الموعد غير صحيح'),
  notes: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Time slots query parameter validation schema
 */
export const timeSlotsSchema = z.object({
  branchId: z.coerce.number().int().positive('معرف الفرع غير صحيح'),
  doctorId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'),
});

export type TimeSlotsQuery = z.infer<typeof timeSlotsSchema>;
