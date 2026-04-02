/**
 * DenClinic - Phase 1 Mock Data
 * Comprehensive mock data for all entities
 */

// ============================================
// 1. USERS
// ============================================

export const MOCK_USERS = [
  // Clinic Owner
  {
    id: 100,
    phoneNumber: '201001111111',
    email: 'owner@advanceddental.com',
    password: 'hashed_password_1', // Never exposed
    name: 'أحمد السيد',
    role: 'CLINIC_OWNER',
    avatar: 'https://i.pravatar.cc/150?img=1',
    clinicId: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  // Admin
  {
    id: 101,
    phoneNumber: '201002222222',
    email: 'admin@tooth.com',
    password: 'hashed_password_2',
    name: 'نور المصري',
    role: 'ADMIN',
    avatar: 'https://i.pravatar.cc/150?img=2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  // Doctors
  {
    id: 1,
    phoneNumber: '201000111111',
    email: 'dr.ahmed@example.com',
    password: 'hashed_password',
    name: 'د. محمد علي',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    phoneNumber: '201000222222',
    email: 'dr.sarah@example.com',
    password: 'hashed_password',
    name: 'د. سارة محمود',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=4',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    phoneNumber: '201000333333',
    email: 'dr.fatima@example.com',
    password: 'hashed_password',
    name: 'د. فاطمة أحمد',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=5',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 4,
    phoneNumber: '201000444444',
    email: 'dr.omar@example.com',
    password: 'hashed_password',
    name: 'د. عمر حسن',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 5,
    phoneNumber: '201000555555',
    email: 'dr.layla@example.com',
    password: 'hashed_password',
    name: 'د. ليلى إبراهيم',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=7',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 6,
    phoneNumber: '201000666666',
    email: 'dr.karim@example.com',
    password: 'hashed_password',
    name: 'د. كريم محمد',
    role: 'DOCTOR',
    avatar: 'https://i.pravatar.cc/150?img=8',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  // Patients
  {
    id: 1000,
    phoneNumber: '201010000001',
    email: 'patient1@example.com',
    password: 'hashed_password',
    name: 'مريض تجريبي',
    role: 'PATIENT',
    avatar: 'https://i.pravatar.cc/150?img=9',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 1001,
    phoneNumber: '201010000002',
    email: 'patient2@example.com',
    password: 'hashed_password',
    name: 'فاطمة علي',
    role: 'PATIENT',
    avatar: 'https://i.pravatar.cc/150?img=10',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 1002,
    phoneNumber: '201010000003',
    email: 'patient3@example.com',
    password: 'hashed_password',
    name: 'محمود حسن',
    role: 'PATIENT',
    avatar: 'https://i.pravatar.cc/150?img=11',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
];

// ============================================
// 2. PATIENTS (Medical Profiles)
// ============================================

export const MOCK_PATIENTS = [
  {
    id: 1,
    userId: 1000,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'Male',
    bloodType: 'O+',
    allergies: 'بنسلين',
    medicalHistory: 'لا يوجد أمراض مزمنة',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    userId: 1001,
    dateOfBirth: new Date('1988-03-22'),
    gender: 'Female',
    bloodType: 'A+',
    allergies: 'لا يوجد',
    medicalHistory: 'ضغط دم مرتفع - تحت الملاحظة',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 3,
    userId: 1002,
    dateOfBirth: new Date('2010-07-10'),
    gender: 'Male',
    bloodType: 'B+',
    allergies: 'لا يوجد',
    medicalHistory: 'صحة جيدة',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
];

// ============================================
// 3. PATIENT GUARDIANS (Family)
// ============================================

export const MOCK_PATIENT_GUARDIANS = [
  {
    id: 1,
    guardianUserId: 1001, // فاطمة علي
    patientId: 3, // محمود حسن (son)
    relationship: 'PARENT',
    canBook: true,
    canView: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 2,
    guardianUserId: 1000, // مريض تجريبي
    patientId: 1, // self
    relationship: 'SELF',
    canBook: true,
    canView: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ============================================
// 4. SUBSCRIPTION PLANS (Clinic-Level)
// ============================================

export const MOCK_SUBSCRIPTION_PLANS = [
  {
    id: 1,
    tier: 'BASIC',
    name: 'باقة أساسية',
    description: 'مناسبة للعيادات الصغيرة',
    monthlyPrice: 1000,
    annualPrice: 10000,
    maxBranches: 1,
    maxDoctors: 5,
    maxAppointments: 100,
    features: [
      'appointment_tracking',
      'patient_basic_info',
      'sms_reminders',
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    tier: 'PROFESSIONAL',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    tier: 'ENTERPRISE',
    name: 'باقة متقدمة',
    description: 'مناسبة للعيادات الكبيرة ومجموعات العيادات',
    monthlyPrice: 5000,
    annualPrice: 50000,
    maxBranches: null,
    maxDoctors: null,
    maxAppointments: null,
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ============================================
// 5. SUBSCRIPTIONS (Clinic Subscriptions)
// ============================================

export const MOCK_SUBSCRIPTIONS = [
  {
    id: 1,
    clinicId: 1,
    planId: 2, // PROFESSIONAL tier
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    renewalDate: new Date('2025-01-01'),
    status: 'ACTIVE',
    monthlyBilled: false,
    autoRenew: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ============================================
// 6. CLINICS
// ============================================

export const MOCK_CLINICS = [
  {
    id: 1,
    ownerId: 100,
    name: 'عيادة الأسنان المتقدمة',
    description: 'عيادة أسنان حديثة بأحدث المعدات',
    specialty: 'طب الأسنان',
    phone: '02012345678',
    email: 'info@advanceddental.com',
    website: 'www.advanceddental.com',
    logo: 'https://via.placeholder.com/200?text=Advanced+Dental',
    images: [
      'https://via.placeholder.com/800?text=Clinic+1',
      'https://via.placeholder.com/800?text=Clinic+2',
    ],
    rating: 4.7,
    reviewCount: 45,
    currentSubscriber: true,
    subscriptionId: 1,
    latitude: 30.0444,
    longitude: 31.2357,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    ownerId: null,
    name: 'عيادة القاهرة الطبية',
    description: 'متخصصون في طب الأسنان التجميلي',
    specialty: 'طب الأسنان',
    phone: '02087654321',
    email: 'info@cairo-medical.com',
    website: 'www.cairo-medical.com',
    logo: 'https://via.placeholder.com/200?text=Cairo+Medical',
    images: [],
    rating: 4.5,
    reviewCount: 32,
    currentSubscriber: false,
    subscriptionId: null,
    latitude: 30.0546,
    longitude: 31.2453,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 3,
    ownerId: null,
    name: 'مركز السلام الطبي',
    description: 'مركز متكامل للخدمات السنية',
    specialty: 'طب الأسنان',
    phone: '02011223344',
    email: 'info@peace-medical.com',
    website: 'www.peace-medical.com',
    logo: 'https://via.placeholder.com/200?text=Peace+Medical',
    images: [],
    rating: 4.3,
    reviewCount: 28,
    currentSubscriber: false,
    subscriptionId: null,
    latitude: 29.9614,
    longitude: 31.3385,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 4,
    ownerId: null,
    name: 'بريق الابتسامة',
    description: 'متخصصون في تقويم الأسنان',
    specialty: 'طب الأسنان',
    phone: '02055667788',
    email: 'info@smile-dental.com',
    website: 'www.smile-dental.com',
    logo: 'https://via.placeholder.com/200?text=Smile+Dental',
    images: [],
    rating: 4.6,
    reviewCount: 38,
    currentSubscriber: false,
    subscriptionId: null,
    latitude: 30.0626,
    longitude: 31.2453,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 5,
    ownerId: null,
    name: 'عيادة دينت بلس',
    description: 'عيادة شاملة لجميع خدمات طب الأسنان',
    specialty: 'طب الأسنان',
    phone: '02099887766',
    email: 'info@dentplus.com',
    website: 'www.dentplus.com',
    logo: 'https://via.placeholder.com/200?text=Dent+Plus',
    images: [],
    rating: 4.4,
    reviewCount: 35,
    currentSubscriber: false,
    subscriptionId: null,
    latitude: 30.0611,
    longitude: 31.2465,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// ============================================
// 7. BRANCHES
// ============================================

export const MOCK_BRANCHES = [
  {
    id: 1,
    clinicId: 1,
    name: 'فرع الدقي الرئيسي',
    address: '19 شارع النيل، الدقي، الجيزة',
    phone: '02012345678',
    latitude: 30.08,
    longitude: 31.20,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    clinicId: 1,
    name: 'فرع المعادي',
    address: 'شارع النيل، المعادي، القاهرة',
    phone: '02012345679',
    latitude: 29.98,
    longitude: 31.27,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    clinicId: 2,
    name: 'فرع مدينة نصر',
    address: 'شارع عباس العقاد، مدينة نصر',
    phone: '02087654321',
    latitude: 30.06,
    longitude: 31.35,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 4,
    clinicId: 3,
    name: 'فرع الزمالك',
    address: 'شارع 26 يوليو، الزمالك، القاهرة',
    phone: '02011223344',
    latitude: 30.07,
    longitude: 31.17,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 5,
    clinicId: 4,
    name: 'فرع الشيخ زايد',
    address: 'شارع التسعين، الشيخ زايد',
    phone: '02055667788',
    latitude: 30.01,
    longitude: 31.03,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 6,
    clinicId: 5,
    name: 'فرع القاهرة الجديدة',
    address: 'شارع الرحاب، القاهرة الجديدة',
    phone: '02099887766',
    latitude: 30.04,
    longitude: 31.45,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 7,
    clinicId: 5,
    name: 'فرع مصر الجديدة',
    address: 'شارع النيل، مصر الجديدة',
    phone: '02099887767',
    latitude: 30.08,
    longitude: 31.32,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// ============================================
// 8. SERVICES
// ============================================

export const MOCK_SERVICES = [
  // Clinic 1 Services
  {
    id: 1,
    clinicId: 1,
    name: 'تنظيف الأسنان',
    description: 'تنظيف دوري للأسنان وإزالة الرواسب',
    icon: '🪥',
    basePrice: 150,
    estimatedDuration: 30,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    clinicId: 1,
    name: 'الحشو العادي',
    description: 'علاج حشو للأسنان المسوسة',
    icon: '🦷',
    basePrice: 300,
    estimatedDuration: 45,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    clinicId: 1,
    name: 'الإجراءات الوقائية',
    description: 'معالجات وقائية وتطعيمات',
    icon: '💉',
    basePrice: 200,
    estimatedDuration: 40,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  // Clinic 2 Services
  {
    id: 4,
    clinicId: 2,
    name: 'تبييض الأسنان',
    description: 'تبييض احترافي للأسنان',
    icon: '✨',
    basePrice: 500,
    estimatedDuration: 60,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 5,
    clinicId: 2,
    name: 'تقويم الأسنان',
    description: 'تقويم وتصحيح الأسنان',
    icon: '🎯',
    basePrice: 2000,
    estimatedDuration: 120,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 6,
    clinicId: 2,
    name: 'الحشو الجمالي',
    description: 'حشو جمالي بألوان متطابقة',
    icon: '💎',
    basePrice: 400,
    estimatedDuration: 60,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  // Clinic 3 Services
  {
    id: 7,
    clinicId: 3,
    name: 'خلع الأسنان',
    description: 'خلع آمن وحديث للأسنان',
    icon: '⚙️',
    basePrice: 300,
    estimatedDuration: 45,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 8,
    clinicId: 3,
    name: 'جراحة اللثة',
    description: 'علاج مشاكل اللثة',
    icon: '🔬',
    basePrice: 600,
    estimatedDuration: 90,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 9,
    clinicId: 3,
    name: 'زراعة الأسنان',
    description: 'زراعة أسنان متقدمة',
    icon: '🌱',
    basePrice: 3000,
    estimatedDuration: 150,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  // Clinic 4 Services
  {
    id: 10,
    clinicId: 4,
    name: 'تقويم معادن',
    description: 'تقويم أسنان بأقواس معدنية',
    icon: '🛠️',
    basePrice: 1500,
    estimatedDuration: 90,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 11,
    clinicId: 4,
    name: 'تقويم شفاف',
    description: 'تقويم أسنان شفاف وغير ظاهر',
    icon: '👻',
    basePrice: 2500,
    estimatedDuration: 90,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  // Clinic 5 Services
  {
    id: 12,
    clinicId: 5,
    name: 'علاج العصب',
    description: 'معالجة جذور الأسنان',
    icon: '🔥',
    basePrice: 800,
    estimatedDuration: 120,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 13,
    clinicId: 5,
    name: 'تركيب التاج',
    description: 'تركيب تاج سيراميك أو معدني',
    icon: '👑',
    basePrice: 700,
    estimatedDuration: 60,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 14,
    clinicId: 5,
    name: 'تثبيت الجسر',
    description: 'تثبيت جسر للأسنان الناقصة',
    icon: '🌉',
    basePrice: 1000,
    estimatedDuration: 90,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// ============================================
// 9. DOCTORS
// ============================================

export const MOCK_DOCTORS = [
  {
    id: 1,
    userId: 1,
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    userId: 2,
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    userId: 3,
    clinicId: 2,
    branchId: 3,
    specialization: 'تجميل الأسنان',
    bio: 'د. فاطمة أحمد متخصصة في إجراءات تجميل الأسنان والتبييض',
    avatar: 'https://i.pravatar.cc/150?img=5',
    yearsOfExperience: 5,
    qualifications: 'بكالوريوس طب أسنان، دبلوم تجميل',
    rating: 4.9,
    reviewCount: 38,
    servicesOffered: [4, 5],// تبييض، تقويم
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 4,
    userId: 4,
    clinicId: 3,
    branchId: 4,
    specialization: 'جراحة فم وأسنان',
    bio: 'د. عمر حسن متخصص في جراحات الفم والأسنان المعقدة',
    avatar: 'https://i.pravatar.cc/150?img=6',
    yearsOfExperience: 10,
    qualifications: 'بكالوريوس، ماجستير جراحة فم',
    rating: 4.6,
    reviewCount: 30,
    servicesOffered: [7, 8], // خلع، جراحة لثة
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 5,
    userId: 5,
    clinicId: 4,
    branchId: 5,
    specialization: 'تقويم متقدم',
    bio: 'د. ليلى إبراهيم متخصصة في التقويم الشامل',
    avatar: 'https://i.pravatar.cc/150?img=7',
    yearsOfExperience: 7,
    qualifications: 'بكالوريوس، متخصصة تقويم الأسنان',
    rating: 4.7,
    reviewCount: 41,
    servicesOffered: [10, 11], // تقويم معادن، شفاف
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 6,
    userId: 6,
    clinicId: 5,
    branchId: 6,
    specialization: 'علاج العصب',
    bio: 'د. كريم محمد متخصص في علاج جذور الأسنان',
    avatar: 'https://i.pravatar.cc/150?img=8',
    yearsOfExperience: 9,
    qualifications: 'بكالوريوس، متخصص علاج عصب',
    rating: 4.5,
    reviewCount: 35,
    servicesOffered: [12, 13], // علاج عصب، تركيب تاج
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// ============================================
// 10. SLOTS (Doctor Availability)
// ============================================

export const MOCK_SLOTS = [
  {
    id: 1,
    doctorId: 1,
    branchId: 1,
    date: new Date('2026-04-05'),
    time: '09:00',
    available: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    doctorId: 1,
    branchId: 1,
    date: new Date('2026-04-05'),
    time: '10:00',
    available: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    doctorId: 1,
    branchId: 1,
    date: new Date('2026-04-05'),
    time: '14:00',
    available: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 4,
    doctorId: 2,
    branchId: 1,
    date: new Date('2026-04-06'),
    time: '11:00',
    available: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 5,
    doctorId: 3,
    branchId: 3,
    date: new Date('2026-04-07'),
    time: '15:00',
    available: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
];

// ============================================
// 11. APPOINTMENTS (Bookings)
// ============================================

export const MOCK_APPOINTMENTS = [
  {
    id: 'appt_001_cuid',
    patientId: 1,
    userId: 1,
    bookedForPatientId: null, // Booking for self
    clinicId: 1,
    branchId: 1,
    doctorId: 1,
    serviceId: 1,
    slotId: 3, // Booked slot
    appointmentDate: new Date('2026-04-05'),
    appointmentTime: '14:00',
    status: 'CONFIRMED',
    notes: 'أول زيارة',
    reasonForVisit: 'فحص عام',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'appt_002_cuid',
    patientId: 2,
    userId: 1,
    bookedForPatientId: null,
    clinicId: 2,
    branchId: 3,
    doctorId: 3,
    serviceId: 5,
    slotId: null,
    appointmentDate: new Date('2026-04-06'),
    appointmentTime: '14:30',
    status: 'PENDING',
    notes: 'فحص عام',
    reasonForVisit: 'استشارة',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 'appt_003_cuid',
    patientId: 3,
    userId: 1,
    bookedForPatientId: 3, // Booking for son
    clinicId: 3,
    branchId: 4,
    doctorId: 2,
    serviceId: 9,
    slotId: null,
    appointmentDate: new Date('2026-04-03'),
    appointmentTime: '11:00',
    status: 'COMPLETED',
    notes: 'متابعة',
    reasonForVisit: 'متابعة العلاج',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
];

// ============================================
// 12. PAYMENTS
// ============================================

export const MOCK_PAYMENTS = [
  {
    id: 'payment_001_cuid',
    userId: 1000,
    amount: 200,
    currency: 'EGP',
    method: 'CASH',
    status: 'COMPLETED',
    appointmentId: 'appt_001_cuid',
    subscriptionId: null,
    transactionId: 'txn_12345',
    transactionTime: new Date('2024-01-01'),
    description: 'دفع لفحص الأسنان',
    receiptUrl: 'https://example.com/receipt_001.pdf',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'subscription_001_cuid',
    userId: 100, // Clinic owner
    amount: 25000,
    currency: 'EGP',
    method: 'BANK_TRANSFER',
    status: 'COMPLETED',
    appointmentId: null,
    subscriptionId: 1,
    transactionId: 'txn_sub_001',
    transactionTime: new Date('2024-01-01'),
    description: 'دفع الاشتراك السنوي - الخطة الاحترافية',
    receiptUrl: 'https://example.com/invoice_sub_001.pdf',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ============================================
// 13. RATINGS
// ============================================

export const MOCK_RATINGS = [
  {
    id: 1,
    userId: 1000,
    clinicId: 1,
    rating: 5,
    comment: 'عيادة ممتازة، الأطباء ودعين جداً',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    userId: 1001,
    clinicId: 2,
    rating: 4,
    comment: 'خدمة جيدة، الموظفون لطيفون',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 3,
    userId: 1002,
    clinicId: 1,
    rating: 5,
    comment: 'أفضل عيادة في المنطقة',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 4,
    userId: 1000,
    clinicId: 3,
    rating: 4,
    comment: 'جميل لكن قد تكون الأسعار مرتفعة قليلاً',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
  {
    id: 5,
    userId: 1001,
    clinicId: 4,
    rating: 5,
    comment: 'تقويم أسنان ممتاز، النتائج رائعة',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 6,
    userId: 1002,
    clinicId: 5,
    rating: 4,
    comment: 'خدمة موثوقة وجودة عالية',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 7,
    userId: 1000,
    clinicId: 4,
    rating: 5,
    comment: 'الأطباء محترفون جداً',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
];

// Legacy names for backward compatibility (will be deprecated)
export const MOCK_TIME_SLOTS = MOCK_SLOTS;
export const MOCK_BOOKINGS = MOCK_APPOINTMENTS;
