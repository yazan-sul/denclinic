/**
 * Patient Data Fixtures
 * Contains seed data for:
 * - User (patient role)
 * - Patient (medical profiles)
 */

import { seedConfig } from './seedConfig';

// ============================================
// PATIENT USERS (User table with roles=['PATIENT'])
// ============================================

export const TEST_PASSWORD = 'Password123!';

export const patientUsers = [
  {
    phoneNumber: '201010000001',
    email: 'patient1@example.com',
    password: TEST_PASSWORD,
    name: 'حسن أحمد',
    roles: ['PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=20',
  },
  {
    phoneNumber: '201010000002',
    email: 'patient2@example.com',
    password: TEST_PASSWORD,
    name: 'فاطمة علي',
    roles: ['PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=21',
  },
  {
    phoneNumber: '201010000003',
    email: 'patient3@example.com',
    password: TEST_PASSWORD,
    name: 'محمود حسن',
    roles: ['PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=22',
  },
  {
    phoneNumber: '201010000004',
    email: 'patient4@example.com',
    password: TEST_PASSWORD,
    name: 'نور محمود',
    roles: ['PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=23',
  },
  {
    phoneNumber: '201010000005',
    email: 'patient5@example.com',
    password: TEST_PASSWORD,
    name: 'سارة إبراهيم',
    roles: ['PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=24',
  },
];

// ============================================
// PATIENT PROFILES (Depends on: User)
// ============================================

export const patientProfiles = [
  {
    // Patient 1: حسن أحمد
    userIndex: 0,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'Male',
    bloodType: 'O+',
    allergies: 'بنسلين',
    medicalHistory: 'لا يوجد أمراض مزمنة',
  },
  {
    // Patient 2: فاطمة علي
    userIndex: 1,
    dateOfBirth: new Date('1988-03-22'),
    gender: 'Female',
    bloodType: 'A+',
    allergies: 'لا يوجد',
    medicalHistory: 'ضغط دم مرتفع - تحت الملاحظة',
  },
  {
    // Patient 3: محمود حسن
    userIndex: 2,
    dateOfBirth: new Date('2010-07-10'),
    gender: 'Male',
    bloodType: 'B+',
    allergies: 'لا يوجد',
    medicalHistory: 'صحة جيدة',
  },
  {
    // Patient 4: نور محمود
    userIndex: 3,
    dateOfBirth: new Date('2005-12-01'),
    gender: 'Female',
    bloodType: 'AB+',
    allergies: 'لا يوجد',
    medicalHistory: 'صحة جيدة',
  },
  {
    // Patient 5: سارة إبراهيم
    userIndex: 4,
    dateOfBirth: new Date('1992-08-14'),
    gender: 'Female',
    bloodType: 'B-',
    allergies: 'الأسبرين',
    medicalHistory: 'حساسية من المضادات الحيوية معينة',
  },
];

// ============================================
// CLINIC OWNER USER (For clinic ownership)
// ============================================

export const clinicOwnerUser = {
  phoneNumber: '201001111111',
  email: 'owner@advanceddental.com',
  password: TEST_PASSWORD,
  name: 'أحمد السيد',
  roles: ['CLINIC_OWNER', 'PATIENT'] as const,
  avatar: 'https://i.pravatar.cc/150?img=1',
};

// ============================================
// STAFF USERS (roles=['STAFF', 'PATIENT'])
// ============================================

export const staffUsers = [
  {
    phoneNumber: '201001234567',
    email: 'staff1@advanceddental.com',
    password: TEST_PASSWORD,
    name: 'منى خالد',
    roles: ['STAFF', 'PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=9',
  },
  {
    phoneNumber: '201001234568',
    email: 'staff2@advanceddental.com',
    password: TEST_PASSWORD,
    name: 'رامي سالم',
    roles: ['STAFF', 'PATIENT'] as const,
    avatar: 'https://i.pravatar.cc/150?img=10',
  },
];

export const staffProfiles = [
  {
    userIndex: 0,
    clinicIndex: 0,
    branchIndex: 0,
    position: 'سكرتيرة',
    department: 'الاستقبال',
  },
  {
    userIndex: 1,
    clinicIndex: 0,
    branchIndex: 1,
    position: 'مساعد طبيب',
    department: 'العيادة',
  },
];

// ============================================
// RATINGS (Sample reviews from patients)
// ============================================

export const ratings = [
  {
    userId: seedConfig.PATIENT_USER_ID_START, // Patient 1 reviews Clinic 1
    clinicId: 1,
    rating: 4.5,
    comment: 'خدمة ممتازة وطاقم متعاون جداً',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START + 1, // Patient 2 reviews Clinic 1
    clinicId: 1,
    rating: 5,
    comment: 'أفضل عيادة أسنان زرتها، نظيفة وحديثة',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START + 2, // Patient 3 reviews Clinic 2
    clinicId: 2,
    rating: 4,
    comment: 'الدكاترة محترفين والخدمة جيدة',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START + 3, // Patient 4 reviews Clinic 3
    clinicId: 3,
    rating: 4.5,
    comment: 'مكان هادئ واطباء ماهرين',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START + 4, // Patient 5 reviews Clinic 4
    clinicId: 4,
    rating: 5,
    comment: 'تقويم ممتاز والنتائج رائعة',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START, // Patient 1 reviews Clinic 2
    clinicId: 2,
    rating: 4.5,
    comment: 'متخصصين وأسعار معقولة',
  },
  {
    userId: seedConfig.PATIENT_USER_ID_START + 1, // Patient 2 reviews Clinic 5
    clinicId: 5,
    rating: 4,
    comment: 'جيدة لكن الانتظار عادة طويل',
  },
];
