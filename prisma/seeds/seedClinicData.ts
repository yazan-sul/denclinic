/**
 * Clinic Data Fixtures
 * Contains seed data for:
 * - SubscriptionPlan
 * - Clinic
 * - Branch
 * - Service
 */

import { seedConfig } from './seedConfig';

// ============================================
// SUBSCRIPTION PLANS (No dependencies)
// ============================================

export const subscriptionPlans = [
  {
    tier: 'BASIC' as const,
    name: 'باقة أساسية',
    description: 'مناسبة للعيادات الصغيرة',
    monthlyPrice: 1000,
    annualPrice: 10000,
    maxBranches: 1,
    maxDoctors: 5,
    maxAppointments: 100,
    features: ['appointment_tracking', 'patient_basic_info', 'sms_reminders'],
  },
  {
    tier: 'PROFESSIONAL' as const,
    name: 'باقة احترافية',
    description: 'مناسبة للعيادات المتوسطة',
    monthlyPrice: 2500,
    annualPrice: 25000,
    maxBranches: 3,
    maxDoctors: 20,
    maxAppointments: 500,
    features: [
      'appointment_tracking',
      'patient_history',
      'sms_reminders',
      'email_notifications',
      'appointment_reports',
    ],
  },
  {
    tier: 'ENTERPRISE' as const,
    name: 'باقة متقدمة',
    description: 'مناسبة للعيادات الكبيرة ومجموعات العيادات',
    monthlyPrice: 5000,
    annualPrice: 50000,
    maxBranches: 999, // Effectively unlimited
    maxDoctors: 999,  // Effectively unlimited
    maxAppointments: 9999,  // Effectively unlimited
    features: [
      'appointment_tracking',
      'patient_history',
      'sms_reminders',
      'email_notifications',
      'appointment_reports',
      'staff_management',
      'financial_reports',
      'api_access',
    ],
  },
];

// ============================================
// CLINICS (Depends on: SubscriptionPlan)
// ============================================

export const clinics = [
  {
    name: 'عيادة الأسنان المتقدمة',
    description: 'عيادة أسنان حديثة بأحدث المعدات',
    specialty: 'طب الأسنان',
    phone: '0201012345678',
    email: 'info@advanceddental.com',
    website: 'https://advanceddental.com',
    logo: 'https://via.placeholder.com/200?text=Advanced+Dental',
    images: [
      'https://via.placeholder.com/800?text=Advanced+Clinic+1',
      'https://via.placeholder.com/800?text=Advanced+Clinic+2',
    ],
    rating: 4.7,
    reviewCount: 45,
    currentSubscriber: true,
    ownerId: seedConfig.CLINIC_OWNER_USER_ID,
  },
  {
    name: 'عيادة القاهرة الطبية',
    description: 'متخصصون في طب الأسنان التجميلي',
    specialty: 'طب الأسنان',
    phone: '0201087654321',
    email: 'info@cairo-medical.com',
    website: 'https://cairo-medical.com',
    logo: 'https://via.placeholder.com/200?text=Cairo+Medical',
    images: [],
    rating: 4.5,
    reviewCount: 32,
    currentSubscriber: false,
    ownerId: null,
  },
  {
    name: 'مركز السلام الطبي',
    description: 'مركز متكامل للخدمات السنية',
    specialty: 'طب الأسنان',
    phone: '0201011223344',
    email: 'info@peace-medical.com',
    website: 'https://peace-medical.com',
    logo: 'https://via.placeholder.com/200?text=Peace+Medical',
    images: [],
    rating: 4.3,
    reviewCount: 28,
    currentSubscriber: false,
    ownerId: null,
  },
  {
    name: 'بريق الابتسامة',
    description: 'متخصصون في تقويم الأسنان',
    specialty: 'طب الأسنان',
    phone: '0201055667788',
    email: 'info@smile-dental.com',
    website: 'https://smile-dental.com',
    logo: 'https://via.placeholder.com/200?text=Smile+Dental',
    images: [],
    rating: 4.6,
    reviewCount: 38,
    currentSubscriber: false,
    ownerId: null,
  },
  {
    name: 'عيادة دينت بلس',
    description: 'عيادة شاملة لجميع خدمات طب الأسنان',
    specialty: 'طب الأسنان',
    phone: '0201099887766',
    email: 'info@dentplus.com',
    website: 'https://dentplus.com',
    logo: 'https://via.placeholder.com/200?text=Dent+Plus',
    images: [],
    rating: 4.4,
    reviewCount: 35,
    currentSubscriber: false,
    ownerId: null,
  },
];

// ============================================
// BRANCHES (Depends on: Clinic)
// ============================================

export const branches = [
  // Clinic 1 branches
  {
    clinicId: 1,
    name: 'فرع الدقي الرئيسي',
    address: '19 شارع النيل، الدقي، الجيزة',
    phone: '0201012345678',
    latitude: 30.08,
    longitude: 31.2,
  },
  {
    clinicId: 1,
    name: 'فرع المعادي',
    address: 'شارع النيل، المعادي، القاهرة',
    phone: '0201012345679',
    latitude: 29.98,
    longitude: 31.27,
  },
  // Clinic 2 branches
  {
    clinicId: 2,
    name: 'فرع مدينة نصر',
    address: 'شارع عباس العقاد، مدينة نصر',
    phone: '0201087654321',
    latitude: 30.06,
    longitude: 31.35,
  },
  // Clinic 3 branches
  {
    clinicId: 3,
    name: 'فرع الزمالك',
    address: 'شارع 26 يوليو، الزمالك، القاهرة',
    phone: '0201011223344',
    latitude: 30.07,
    longitude: 31.17,
  },
  // Clinic 4 branches
  {
    clinicId: 4,
    name: 'فرع الشيخ زايد',
    address: 'شارع التسعين، الشيخ زايد',
    phone: '0201055667788',
    latitude: 30.01,
    longitude: 31.03,
  },
  // Clinic 5 branches
  {
    clinicId: 5,
    name: 'فرع القاهرة الجديدة',
    address: 'شارع الرحاب، القاهرة الجديدة',
    phone: '0201099887766',
    latitude: 30.04,
    longitude: 31.45,
  },
  {
    clinicId: 5,
    name: 'فرع مصر الجديدة',
    address: 'شارع النيل، مصر الجديدة',
    phone: '0201099887767',
    latitude: 30.08,
    longitude: 31.32,
  },
];

// ============================================
// SERVICES (Depends on: Clinic)
// ============================================

export const services = [
  // Clinic 1 Services
  {
    clinicId: 1,
    name: 'تنظيف الأسنان',
    description: 'تنظيف دوري للأسنان وإزالة الرواسب',
    icon: '🪥',
    basePrice: 150,
    estimatedDuration: 30,
  },
  {
    clinicId: 1,
    name: 'الحشو العادي',
    description: 'علاج حشو للأسنان المسوسة',
    icon: '🦷',
    basePrice: 300,
    estimatedDuration: 45,
  },
  {
    clinicId: 1,
    name: 'الإجراءات الوقائية',
    description: 'معالجات وقائية وتطعيمات',
    icon: '💉',
    basePrice: 200,
    estimatedDuration: 40,
  },
  // Clinic 2 Services
  {
    clinicId: 2,
    name: 'تبييض الأسنان',
    description: 'تبييض احترافي للأسنان',
    icon: '✨',
    basePrice: 500,
    estimatedDuration: 60,
  },
  {
    clinicId: 2,
    name: 'تقويم الأسنان',
    description: 'تقويم وتصحيح الأسنان',
    icon: '🎯',
    basePrice: 2000,
    estimatedDuration: 120,
  },
  {
    clinicId: 2,
    name: 'الحشو الجمالي',
    description: 'حشو جمالي بألوان متطابقة',
    icon: '💎',
    basePrice: 400,
    estimatedDuration: 60,
  },
  // Clinic 3 Services
  {
    clinicId: 3,
    name: 'خلع الأسنان',
    description: 'خلع آمن وحديث للأسنان',
    icon: '⚙️',
    basePrice: 300,
    estimatedDuration: 45,
  },
  {
    clinicId: 3,
    name: 'جراحة اللثة',
    description: 'علاج مشاكل اللثة',
    icon: '🔬',
    basePrice: 600,
    estimatedDuration: 90,
  },
  {
    clinicId: 3,
    name: 'زراعة الأسنان',
    description: 'زراعة أسنان متقدمة',
    icon: '🌱',
    basePrice: 3000,
    estimatedDuration: 150,
  },
  // Clinic 4 Services
  {
    clinicId: 4,
    name: 'تقويم معادن',
    description: 'تقويم أسنان بأقواس معدنية',
    icon: '🛠️',
    basePrice: 1500,
    estimatedDuration: 90,
  },
  {
    clinicId: 4,
    name: 'تقويم شفاف',
    description: 'تقويم أسنان شفاف وغير ظاهر',
    icon: '👻',
    basePrice: 2500,
    estimatedDuration: 90,
  },
  // Clinic 5 Services
  {
    clinicId: 5,
    name: 'علاج العصب',
    description: 'معالجة جذور الأسنان',
    icon: '🔥',
    basePrice: 800,
    estimatedDuration: 120,
  },
  {
    clinicId: 5,
    name: 'تركيب التاج',
    description: 'تركيب تاج سيراميك أو معدني',
    icon: '👑',
    basePrice: 700,
    estimatedDuration: 60,
  },
  {
    clinicId: 5,
    name: 'تثبيت الجسر',
    description: 'تثبيت جسر للأسنان الناقصة',
    icon: '🌉',
    basePrice: 1000,
    estimatedDuration: 90,
  },
];
