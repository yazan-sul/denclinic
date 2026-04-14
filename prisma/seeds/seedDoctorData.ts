/**
 * Doctor Data Fixtures
 * Contains seed data for:
 * - User (doctor role)
 * - Doctor (profiles)
 * - Slot (availability)
 */

import { seedConfig, generateAprilDates, generateTimeSlots } from './seedConfig';

// ============================================
// DOCTOR USERS (User table with role='DOCTOR')
// ============================================

export const doctorUsers = [
  {
    phoneNumber: '201000111111',
    email: 'dr.ahmed@example.com',
    password: 'hashed_demo_password_1', // Will be hashed in actual seed
    name: 'د. محمد علي',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    phoneNumber: '201000222222',
    email: 'dr.sarah@example.com',
    password: 'hashed_demo_password_2',
    name: 'د. سارة محمود',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=4',
  },
  {
    phoneNumber: '201000333333',
    email: 'dr.fatima@example.com',
    password: 'hashed_demo_password_3',
    name: 'د. فاطمة أحمد',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
  {
    phoneNumber: '201000444444',
    email: 'dr.omar@example.com',
    password: 'hashed_demo_password_4',
    name: 'د. عمر حسن',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=6',
  },
  {
    phoneNumber: '201000555555',
    email: 'dr.layla@example.com',
    password: 'hashed_demo_password_5',
    name: 'د. ليلى إبراهيم',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=7',
  },
  {
    phoneNumber: '201000666666',
    email: 'dr.karim@example.com',
    password: 'hashed_demo_password_6',
    name: 'د. كريم محمد',
    role: 'DOCTOR' as const,
    avatar: 'https://i.pravatar.cc/150?img=8',
  },
];

// ============================================
// DOCTOR PROFILES (Depends on: User, Clinic, Branch)
// ============================================

export const doctorProfiles = [
  {
    // Dr. Ahmed - Clinic 1, Branch 1
    userIndex: 0, // Maps to doctorUsers[0]
    clinicId: 1,
    branchId: 1,
    specialization: 'طب الأسنان العام',
    bio: 'د. محمد علي متخصص في طب الأسنان العام والعلاجات اللثوية',
    avatar: 'https://i.pravatar.cc/150?img=3',
    yearsOfExperience: 8,
    qualifications: 'بكالوريوس طب أسنان، ماجستير زراعة أسنان',
    rating: 4.8,
    reviewCount: 52,
    servicesOffered: [1, 2], // تنظيف، حشو عادي
  },
  {
    // Dr. Sarah - Clinic 1, Branch 1
    userIndex: 1,
    clinicId: 1,
    branchId: 1,
    specialization: 'تقويم الأسنان',
    bio: 'د. سارة محمود متخصصة في تقويم الأسنان بأحدث التقنيات',
    avatar: 'https://i.pravatar.cc/150?img=4',
    yearsOfExperience: 6,
    qualifications: 'بكالوريوس طب أسنان، متخصصة تقويم',
    rating: 4.7,
    reviewCount: 45,
    servicesOffered: [1, 3], // تنظيف، إجراءات وقائية
  },
  {
    // Dr. Fatima - Clinic 2, Branch 3
    userIndex: 2,
    clinicId: 2,
    branchId: 3,
    specialization: 'تجميل الأسنان',
    bio: 'د. فاطمة أحمد متخصصة في إجراءات تجميل الأسنان والتبييض',
    avatar: 'https://i.pravatar.cc/150?img=5',
    yearsOfExperience: 5,
    qualifications: 'بكالوريوس طب أسنان، دبلوم تجميل',
    rating: 4.6,
    reviewCount: 38,
    servicesOffered: [4, 6], // تبييض، حشو جمالي
  },
  {
    // Dr. Omar - Clinic 3, Branch 4
    userIndex: 3,
    clinicId: 3,
    branchId: 4,
    specialization: 'جراحة الفم',
    bio: 'د. عمر حسن متخصص في جراحات الفم والأسنان المعقدة',
    avatar: 'https://i.pravatar.cc/150?img=6',
    yearsOfExperience: 10,
    qualifications: 'بكالوريوس طب أسنان، ماجستير جراحة',
    rating: 4.9,
    reviewCount: 60,
    servicesOffered: [7, 8, 9], // خلع، جراحة لثة، زراعة
  },
  {
    // Dr. Layla - Clinic 4, Branch 5
    userIndex: 4,
    clinicId: 4,
    branchId: 5,
    specialization: 'تقويم الأسنان',
    bio: 'د. ليلى إبراهيم متخصصة في تقويم الأسنان للأطفال والبالغين',
    avatar: 'https://i.pravatar.cc/150?img=7',
    yearsOfExperience: 7,
    qualifications: 'بكالوريوس طب أسنان، دبلوم تقويم أطفال',
    rating: 4.8,
    reviewCount: 55,
    servicesOffered: [10, 11], // تقويم معادن، تقويم شفاف
  },
  {
    // Dr. Karim - Clinic 5, Branch 6
    userIndex: 5,
    clinicId: 5,
    branchId: 6,
    specialization: 'علاج الجذور',
    bio: 'د. كريم محمد متخصص في علاج الجذور والعلاجات المتقدمة',
    avatar: 'https://i.pravatar.cc/150?img=8',
    yearsOfExperience: 9,
    qualifications: 'بكالوريوس طب أسنان، ماجستير علاج الجذور',
    rating: 4.7,
    reviewCount: 48,
    servicesOffered: [12, 13, 14], // علاج العصب، التاج، الجسر
  },
];

// ============================================
// SLOTS (Availability) (Depends on: Doctor, Branch)
// ============================================

/**
 * Generate slots for April 15-30, 2026
 * Each doctor has slots across different days
 */
export function generateSlots(doctorIds: number[], branchIds: number[]): Array<{
  doctorId: number;
  branchId: number;
  slotDate: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}> {
  const slots = [];
  const timeSlots = generateTimeSlots(); // Get morning and afternoon slots
  
  // Generate slots from April 15 to April 30
  const aprilDates = generateAprilDates(16, 15); // Days 15-30

  // Each doctor gets slots across the month
  doctorIds.forEach((doctorId, doctorIndex) => {
    const branchIndex = doctorIndex % branchIds.length;
    const branchId = branchIds[branchIndex];

    // Assign 8 days per doctor with 7 slots per day = 56 slots per doctor
    aprilDates.forEach((date, dateIndex) => {
      if (dateIndex % 2 === doctorIndex % 2) {
        // Stagger doctors across days
        timeSlots.forEach((timeSlot) => {
          slots.push({
            doctorId,
            branchId,
            slotDate: date,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            isAvailable: Math.random() > 0.3, // 70% available, 30% booked
          });
        });
      }
    });
  });

  return slots;
}
