/**
 * Shared type definitions for API responses
 * Use these types in both API routes and components to stay in sync
 */

/**
 * Clinic information
 */
export interface Clinic {
  id: number;
  name: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  distance?: number; // Calculated on frontend
}

/**
 * Clinic details (with branches, services, ratings)
 */
export interface ClinicDetail extends Clinic {
  branches: Branch[];
  services: Service[];
  ratings: Rating[];
}

/**
 * Clinic branch/location
 */
export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  doctorCount?: number;
}

/**
 * Branch details (with clinic, doctors, time slots)
 */
export interface BranchDetail extends Branch {
  clinic: {
    id: number;
    name: string;
    specialty: string;
  };
  doctors: Doctor[];
  timeSlots: TimeSlot[];
}

/**
 * Doctor/specialist
 */
export interface Doctor {
  id: number;
  userId: number;
  branchId: number;
  specialization: string;
  experience?: number;
  bio?: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  user?: User;
  services?: Service[];
}

/**
 * Medical service
 */
export interface Service {
  id: number;
  name: string;
  description?: string;
  icon: string;
}

/**
 * Available time slot
 */
export interface TimeSlot {
  id: number;
  branchId: number;
  date: string | Date;
  time: string;
  available: boolean;
}

/**
 * Booking appointment
 */
export interface Booking {
  id: string;
  userId: number;
  clinicId: number;
  branchId: number;
  doctorId: number;
  serviceId: number;
  appointmentDate: Date | string;
  appointmentTime: string;
  notes?: string | null;
  status: BookingStatus;
  createdAt?: Date;
  updatedAt?: Date;

  // Relations
  clinic?: Clinic;
  branch?: Branch;
  doctor?: Doctor;
  service?: Service;
}

/**
 * Booking statuses
 */
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'PAYMENT_FAILED';

/**
 * Clinic rating/review
 */
export interface Rating {
  id: number;
  clinicId: number;
  userId: number;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  user?: {
    name: string;
    avatar?: string;
  };
}

/**
 * User account
 */
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  emailVerified?: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User roles
 */
export type UserRole = 'PATIENT' | 'DOCTOR' | 'STAFF' | 'ADMIN';

/**
 * Family member (for patient family management)
 */
export interface FamilyMember {
  id: number;
  userId: number; // Parent user
  name: string;
  relationship: string;
  dateOfBirth?: Date;
  medicalHistory?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}
