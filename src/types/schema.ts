/**
 * DenClinic - Phase 1 Core Schema TypeScript Interfaces
 * These interfaces mirror the Prisma schema for use in Next.js frontend
 */

// ============================================
// ENUMS
// ============================================

export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  CLINIC_OWNER = 'CLINIC_OWNER',
}

export enum GuardianRelationship {
  SELF = 'SELF',
  PARENT = 'PARENT',
  SPOUSE = 'SPOUSE',
  SIBLING = 'SIBLING',
  CHILD = 'CHILD',
  GRANDPARENT = 'GRANDPARENT',
  OTHER = 'OTHER',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum SubscriptionTier {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE_PAYMENT = 'ONLINE_PAYMENT',
  INSURANCE = 'INSURANCE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

// ============================================
// USER & IDENTITY INTERFACES
// ============================================

export interface IUser {
  id: number;
  phoneNumber: string;
  email?: string;
  password: string; // Never expose in API responses
  name: string;
  role: UserRole;
  avatar?: string;
  clinicId?: number;
  
  // Relations (optional, included in certain queries)
  patient?: IPatient;
  doctorProfile?: IDoctor;
  clinic?: IClinic;
  appointments?: IAppointment[];
  payments?: IPayment[];
  ratings?: IRating[];
  guardianships?: IPatientGuardian[]; // As guardian
  dependents?: IPatientGuardian[]; // Dependents
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatient {
  id: number;
  userId: number;
  user?: IUser;
  
  dateOfBirth?: Date;
  gender?: string; // Male/Female/Other
  bloodType?: string; // A+, B-, O+, etc.
  allergies?: string; // Comma-separated
  medicalHistory?: string;
  
  guardians?: IPatientGuardian[]; // Family members who can access/book
  appointments?: IAppointment[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientGuardian {
  id: number;
  guardianUserId: number;
  guardianUser?: IUser;
  
  patientId: number;
  dependentPatient?: IPatient;
  
  relationship: GuardianRelationship; // PARENT, CHILD, SPOUSE, etc.
  canBook: boolean; // Can book appointments for this patient
  canView: boolean; // Can view medical info
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CLINIC INTERFACES
// ============================================

export interface IClinic {
  id: number;
  ownerId?: number;
  owner?: IUser;
  
  name: string;
  description?: string;
  specialty: string; // Dentistry, Ophthalmology, etc.
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  images?: string[]; // Array of URLs
  
  rating: number; // Aggregated rating 1-5
  reviewCount: number;
  
  // Subscription
  currentSubscriber: boolean;
  subscriptionId?: number;
  subscription?: ISubscription;
  
  branches?: IBranch[];
  services?: IService[];
  doctors?: IDoctor[];
  appointments?: IAppointment[];
  payments?: IPayment[];
  ratings?: IRating[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IBranch {
  id: number;
  clinicId: number;
  clinic?: IClinic;
  
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  
  doctors?: IDoctor[];
  slots?: ISlot[];
  appointments?: IAppointment[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IService {
  id: number;
  clinicId: number;
  clinic?: IClinic;
  
  name: string;
  description?: string;
  icon?: string; // Emoji or URL
  basePrice?: number;
  estimatedDuration?: number; // In minutes
  
  doctors?: IDoctor[]; // Doctors who offer this service
  appointments?: IAppointment[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DOCTOR INTERFACES
// ============================================

export interface IDoctor {
  id: number;
  userId: number;
  user?: IUser;
  
  clinicId: number;
  clinic?: IClinic;
  
  branchId: number;
  branch?: IBranch;
  
  specialization: string; // Oral Surgery, General Dentistry, etc.
  bio?: string;
  avatar?: string;
  yearsOfExperience?: number;
  qualifications?: string; // Comma-separated
  
  rating: number;
  reviewCount: number;
  
  servicesOffered?: IService[];
  slots?: ISlot[];
  appointments?: IAppointment[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEDULING INTERFACES
// ============================================

export interface ISlot {
  id: number;
  doctorId: number;
  doctor?: IDoctor;
  
  branchId: number;
  branch?: IBranch;
  
  slotDate: Date; // Date of the appointment
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  
  isAvailable: boolean;
  appointment?: IAppointment; // Null if not booked, relation if booked
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointment {
  id: string; // CUID
  
  // Patient & Booker
  patientId: number;
  patient?: IPatient;
  
  userId: number; // Who made the booking (patient or guardian)
  user?: IUser;
  
  bookedForPatientId?: number; // If guardian books for dependent
  
  // Medical Details
  clinicId: number;
  clinic?: IClinic;
  
  branchId: number;
  branch?: IBranch;
  
  doctorId: number;
  doctor?: IDoctor;
  
  serviceId: number;
  service?: IService;
  
  // Slot Reference
  slotId?: number;
  slot?: ISlot;
  
  // Appointment Time
  appointmentDate: Date;
  appointmentTime: string; // HH:MM
  
  // Status
  status: AppointmentStatus;
  notes?: string;
  reasonForVisit?: string;
  
  payment?: IPayment;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUBSCRIPTION INTERFACES
// ============================================

export interface ISubscriptionPlan {
  id: number;
  tier: SubscriptionTier; // BASIC, PROFESSIONAL, ENTERPRISE
  
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  
  maxBranches: number;
  maxDoctors: number;
  maxAppointments?: number; // Null = unlimited
  features: string[]; // ["appointment_tracking", "patient_history", etc.]
  
  subscriptions?: ISubscription[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription {
  id: number;
  clinicId: number;
  clinic?: IClinic;
  
  planId: number;
  plan?: ISubscriptionPlan;
  
  startDate: Date;
  endDate: Date; // When subscription expires
  renewalDate?: Date;
  
  status: SubscriptionStatus;
  monthlyBilled: boolean; // vs annual
  autoRenew: boolean;
  
  payments?: IPayment[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYMENT INTERFACE
// ============================================

export interface IPayment {
  id: string; // CUID
  
  userId: number;
  user?: IUser;
  
  amount: number;
  currency: string; // EGP, USD, etc.
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Can be for appointment or subscription (or both)
  appointmentId?: string;
  appointment?: IAppointment;
  
  subscriptionId?: number;
  subscription?: ISubscription;
  
  transactionId?: string; // External payment gateway ID
  transactionTime: Date;
  
  description?: string; // Invoice description
  receiptUrl?: string; // URL to receipt/invoice PDF
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// RATING INTERFACE
// ============================================

export interface IRating {
  id: number;
  userId: number;
  user?: IUser;
  
  clinicId: number;
  clinic?: IClinic;
  
  rating: number; // 1-5
  comment?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ICreateAppointmentRequest {
  patientId: number;
  clinicId: number;
  branchId: number;
  doctorId: number;
  serviceId: number;
  slotId?: number;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  notes?: string;
  reasonForVisit?: string;
}

export interface ICreatePaymentRequest {
  appointmentId: string;
  method: PaymentMethod;
  cardNumber: string;
  expiry: string;
  cvv: string;
  simulationResult: 'success' | 'failure';
}

export interface ICreateSlotRequest {
  doctorId: number;
  branchId: number;
  slotDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface IUpdateSlotRequest {
  isAvailable?: boolean;
}

export interface ICreateClinicRequest {
  name: string;
  description?: string;
  specialty: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  images?: string[];
}

export interface ICreateBranchRequest {
  clinicId: number;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
}

export interface ICreateDoctorRequest {
  userId: number;
  clinicId: number;
  branchId: number;
  specialization: string;
  bio?: string;
  avatar?: string;
  yearsOfExperience?: number;
  qualifications?: string;
  servicesOffered?: number[]; // Array of service IDs
}

// ============================================
// CONFLICT RESOLUTION & BUSINESS LOGIC
// ============================================

/**
 * When creating an appointment:
 * 1. Check if slot is available (isAvailable = true)
 * 2. Mark slot as isAvailable = false
 * 3. Create appointment with status = PENDING
 * 4. Generate payment record if needed
 */

/**
 * When confirming an appointment:
 * 1. Update appointment status to CONFIRMED
 * 2. Keep slot marked as unavailable
 * 3. Update payment status to COMPLETED
 */

/**
 * When cancelling an appointment:
 * 1. Update appointment status to CANCELLED
 * 2. Mark slot as isAvailable = true (frees it up)
 * 3. Process refund if payment was made
 */
