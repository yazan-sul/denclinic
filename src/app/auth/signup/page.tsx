'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, SignupData } from '@/context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PHONE_PREFIXES = [
  // ── العالم العربي ──────────────────────────────
  { code: '+970', flag: '🇵🇸', label: 'فلسطين' },
  { code: '+972', flag: '🇵🇸', label: 'فلسطين المحتلة' },
  { code: '+962', flag: '🇯🇴', label: 'الأردن' },
  { code: '+966', flag: '🇸🇦', label: 'السعودية' },
  { code: '+971', flag: '🇦🇪', label: 'الإمارات' },
  { code: '+963', flag: '🇸🇾', label: 'سوريا' },
  { code: '+20',  flag: '🇪🇬', label: 'مصر' },
  { code: '+964', flag: '🇮🇶', label: 'العراق' },
  { code: '+965', flag: '🇰🇼', label: 'الكويت' },
  { code: '+974', flag: '🇶🇦', label: 'قطر' },
  { code: '+973', flag: '🇧🇭', label: 'البحرين' },
  { code: '+968', flag: '🇴🇲', label: 'عُمان' },
  { code: '+967', flag: '🇾🇪', label: 'اليمن' },
  { code: '+961', flag: '🇱🇧', label: 'لبنان' },
  { code: '+218', flag: '🇱🇾', label: 'ليبيا' },
  { code: '+216', flag: '🇹🇳', label: 'تونس' },
  { code: '+213', flag: '🇩🇿', label: 'الجزائر' },
  { code: '+212', flag: '🇲🇦', label: 'المغرب' },
  { code: '+249', flag: '🇸🇩', label: 'السودان' },
  { code: '+252', flag: '🇸🇴', label: 'الصومال' },
  { code: '+253', flag: '🇩🇯', label: 'جيبوتي' },
  { code: '+269', flag: '🇰🇲', label: 'جزر القمر' },
  { code: '+222', flag: '🇲🇷', label: 'موريتانيا' },
  // ── آسيا ───────────────────────────────────────
  { code: '+90',  flag: '🇹🇷', label: 'تركيا' },
  { code: '+98',  flag: '🇮🇷', label: 'إيران' },
  { code: '+92',  flag: '🇵🇰', label: 'باكستان' },
  { code: '+91',  flag: '🇮🇳', label: 'الهند' },
  { code: '+86',  flag: '🇨🇳', label: 'الصين' },
  { code: '+81',  flag: '🇯🇵', label: 'اليابان' },
  { code: '+82',  flag: '🇰🇷', label: 'كوريا الجنوبية' },
  { code: '+60',  flag: '🇲🇾', label: 'ماليزيا' },
  { code: '+62',  flag: '🇮🇩', label: 'إندونيسيا' },
  { code: '+63',  flag: '🇵🇭', label: 'الفلبين' },
  { code: '+65',  flag: '🇸🇬', label: 'سنغافورة' },
  { code: '+66',  flag: '🇹🇭', label: 'تايلاند' },
  { code: '+84',  flag: '🇻🇳', label: 'فيتنام' },
  { code: '+880', flag: '🇧🇩', label: 'بنغلاديش' },
  { code: '+94',  flag: '🇱🇰', label: 'سريلانكا' },
  { code: '+95',  flag: '🇲🇲', label: 'ميانمار' },
  { code: '+855', flag: '🇰🇭', label: 'كمبوديا' },
  { code: '+856', flag: '🇱🇦', label: 'لاوس' },
  { code: '+977', flag: '🇳🇵', label: 'نيبال' },
  { code: '+975', flag: '🇧🇹', label: 'بوتان' },
  { code: '+960', flag: '🇲🇻', label: 'المالديف' },
  { code: '+93',  flag: '🇦🇫', label: 'أفغانستان' },
  { code: '+7',   flag: '🇷🇺', label: 'روسيا / كازاخستان' },
  { code: '+992', flag: '🇹🇯', label: 'طاجيكستان' },
  { code: '+993', flag: '🇹🇲', label: 'تركمانستان' },
  { code: '+994', flag: '🇦🇿', label: 'أذربيجان' },
  { code: '+995', flag: '🇬🇪', label: 'جورجيا' },
  { code: '+996', flag: '🇰🇬', label: 'قيرغيزستان' },
  { code: '+998', flag: '🇺🇿', label: 'أوزبكستان' },
  { code: '+976', flag: '🇲🇳', label: 'منغوليا' },
  { code: '+850', flag: '🇰🇵', label: 'كوريا الشمالية' },
  { code: '+852', flag: '🇭🇰', label: 'هونغ كونغ' },
  { code: '+853', flag: '🇲🇴', label: 'ماكاو' },
  { code: '+886', flag: '🇹🇼', label: 'تايوان' },
  { code: '+670', flag: '🇹🇱', label: 'تيمور الشرقية' },
  { code: '+673', flag: '🇧🇳', label: 'بروناي' },
  { code: '+374', flag: '🇦🇲', label: 'أرمينيا' },
  // ── أوروبا ─────────────────────────────────────
  { code: '+1',   flag: '🇺🇸', label: 'الولايات المتحدة / كندا' },
  { code: '+44',  flag: '🇬🇧', label: 'المملكة المتحدة' },
  { code: '+33',  flag: '🇫🇷', label: 'فرنسا' },
  { code: '+49',  flag: '🇩🇪', label: 'ألمانيا' },
  { code: '+39',  flag: '🇮🇹', label: 'إيطاليا' },
  { code: '+34',  flag: '🇪🇸', label: 'إسبانيا' },
  { code: '+31',  flag: '🇳🇱', label: 'هولندا' },
  { code: '+32',  flag: '🇧🇪', label: 'بلجيكا' },
  { code: '+41',  flag: '🇨🇭', label: 'سويسرا' },
  { code: '+43',  flag: '🇦🇹', label: 'النمسا' },
  { code: '+46',  flag: '🇸🇪', label: 'السويد' },
  { code: '+47',  flag: '🇳🇴', label: 'النرويج' },
  { code: '+45',  flag: '🇩🇰', label: 'الدنمارك' },
  { code: '+358', flag: '🇫🇮', label: 'فنلندا' },
  { code: '+48',  flag: '🇵🇱', label: 'بولندا' },
  { code: '+420', flag: '🇨🇿', label: 'التشيك' },
  { code: '+36',  flag: '🇭🇺', label: 'المجر' },
  { code: '+40',  flag: '🇷🇴', label: 'رومانيا' },
  { code: '+30',  flag: '🇬🇷', label: 'اليونان' },
  { code: '+351', flag: '🇵🇹', label: 'البرتغال' },
  { code: '+353', flag: '🇮🇪', label: 'أيرلندا' },
  { code: '+354', flag: '🇮🇸', label: 'آيسلندا' },
  { code: '+356', flag: '🇲🇹', label: 'مالطا' },
  { code: '+357', flag: '🇨🇾', label: 'قبرص' },
  { code: '+359', flag: '🇧🇬', label: 'بلغاريا' },
  { code: '+370', flag: '🇱🇹', label: 'ليتوانيا' },
  { code: '+371', flag: '🇱🇻', label: 'لاتفيا' },
  { code: '+372', flag: '🇪🇪', label: 'إستونيا' },
  { code: '+375', flag: '🇧🇾', label: 'بيلاروسيا' },
  { code: '+380', flag: '🇺🇦', label: 'أوكرانيا' },
  { code: '+381', flag: '🇷🇸', label: 'صربيا' },
  { code: '+382', flag: '🇲🇪', label: 'الجبل الأسود' },
  { code: '+385', flag: '🇭🇷', label: 'كرواتيا' },
  { code: '+386', flag: '🇸🇮', label: 'سلوفينيا' },
  { code: '+387', flag: '🇧🇦', label: 'البوسنة والهرسك' },
  { code: '+389', flag: '🇲🇰', label: 'مقدونيا الشمالية' },
  { code: '+355', flag: '🇦🇱', label: 'ألبانيا' },
  { code: '+377', flag: '🇲🇨', label: 'موناكو' },
  { code: '+378', flag: '🇸🇲', label: 'سان مارينو' },
  { code: '+376', flag: '🇦🇩', label: 'أندورا' },
  { code: '+352', flag: '🇱🇺', label: 'لوكسمبورغ' },
  { code: '+423', flag: '🇱🇮', label: 'ليختنشتاين' },
  { code: '+421', flag: '🇸🇰', label: 'سلوفاكيا' },
  // ── أفريقيا ────────────────────────────────────
  { code: '+27',  flag: '🇿🇦', label: 'جنوب أفريقيا' },
  { code: '+234', flag: '🇳🇬', label: 'نيجيريا' },
  { code: '+254', flag: '🇰🇪', label: 'كينيا' },
  { code: '+255', flag: '🇹🇿', label: 'تنزانيا' },
  { code: '+256', flag: '🇺🇬', label: 'أوغندا' },
  { code: '+233', flag: '🇬🇭', label: 'غانا' },
  { code: '+225', flag: '🇨🇮', label: 'ساحل العاج' },
  { code: '+221', flag: '🇸🇳', label: 'السنغال' },
  { code: '+237', flag: '🇨🇲', label: 'الكاميرون' },
  { code: '+243', flag: '🇨🇩', label: 'الكونغو الديمقراطية' },
  { code: '+242', flag: '🇨🇬', label: 'الكونغو' },
  { code: '+251', flag: '🇪🇹', label: 'إثيوبيا' },
  { code: '+258', flag: '🇲🇿', label: 'موزمبيق' },
  { code: '+260', flag: '🇿🇲', label: 'زامبيا' },
  { code: '+263', flag: '🇿🇼', label: 'زيمبابوي' },
  { code: '+265', flag: '🇲🇼', label: 'ملاوي' },
  { code: '+266', flag: '🇱🇸', label: 'ليسوتو' },
  { code: '+267', flag: '🇧🇼', label: 'بوتسوانا' },
  { code: '+268', flag: '🇸🇿', label: 'إسواتيني' },
  { code: '+250', flag: '🇷🇼', label: 'رواندا' },
  { code: '+257', flag: '🇧🇮', label: 'بوروندي' },
  { code: '+248', flag: '🇸🇨', label: 'سيشيل' },
  { code: '+230', flag: '🇲🇺', label: 'موريشيوس' },
  { code: '+261', flag: '🇲🇬', label: 'مدغشقر' },
  { code: '+232', flag: '🇸🇱', label: 'سيراليون' },
  { code: '+231', flag: '🇱🇷', label: 'ليبيريا' },
  { code: '+224', flag: '🇬🇳', label: 'غينيا' },
  { code: '+245', flag: '🇬🇼', label: 'غينيا بيساو' },
  { code: '+240', flag: '🇬🇶', label: 'غينيا الاستوائية' },
  { code: '+241', flag: '🇬🇦', label: 'الغابون' },
  { code: '+236', flag: '🇨🇫', label: 'أفريقيا الوسطى' },
  { code: '+235', flag: '🇹🇩', label: 'تشاد' },
  { code: '+227', flag: '🇳🇪', label: 'النيجر' },
  { code: '+226', flag: '🇧🇫', label: 'بوركينا فاسو' },
  { code: '+223', flag: '🇲🇱', label: 'مالي' },
  { code: '+228', flag: '🇹🇬', label: 'توغو' },
  { code: '+229', flag: '🇧🇯', label: 'بنين' },
  { code: '+220', flag: '🇬🇲', label: 'غامبيا' },
  { code: '+238', flag: '🇨🇻', label: 'الرأس الأخضر' },
  { code: '+239', flag: '🇸🇹', label: 'ساو تومي وبرينسيبي' },
  { code: '+244', flag: '🇦🇴', label: 'أنغولا' },
  { code: '+246', flag: '🇮🇴', label: 'إقليم المحيط الهندي البريطاني' },
  { code: '+247', flag: '🇸🇭', label: 'جزيرة أسينشن' },
  { code: '+264', flag: '🇳🇦', label: 'ناميبيا' },
  // ── أمريكا اللاتينية ────────────────────────────
  { code: '+55',  flag: '🇧🇷', label: 'البرازيل' },
  { code: '+52',  flag: '🇲🇽', label: 'المكسيك' },
  { code: '+54',  flag: '🇦🇷', label: 'الأرجنتين' },
  { code: '+56',  flag: '🇨🇱', label: 'تشيلي' },
  { code: '+57',  flag: '🇨🇴', label: 'كولومبيا' },
  { code: '+51',  flag: '🇵🇪', label: 'بيرو' },
  { code: '+58',  flag: '🇻🇪', label: 'فنزويلا' },
  { code: '+593', flag: '🇪🇨', label: 'الإكوادور' },
  { code: '+591', flag: '🇧🇴', label: 'بوليفيا' },
  { code: '+595', flag: '🇵🇾', label: 'باراغواي' },
  { code: '+598', flag: '🇺🇾', label: 'أوروغواي' },
  { code: '+53',  flag: '🇨🇺', label: 'كوبا' },
  { code: '+509', flag: '🇭🇹', label: 'هايتي' },
  { code: '+507', flag: '🇵🇦', label: 'بنما' },
  { code: '+506', flag: '🇨🇷', label: 'كوستاريكا' },
  { code: '+505', flag: '🇳🇮', label: 'نيكاراغوا' },
  { code: '+504', flag: '🇭🇳', label: 'هندوراس' },
  { code: '+503', flag: '🇸🇻', label: 'السلفادور' },
  { code: '+502', flag: '🇬🇹', label: 'غواتيمالا' },
  { code: '+501', flag: '🇧🇿', label: 'بليز' },
  { code: '+1787', flag: '🇵🇷', label: 'بورتوريكو' },
  { code: '+592', flag: '🇬🇾', label: 'غيانا' },
  { code: '+597', flag: '🇸🇷', label: 'سورينام' },
  { code: '+594', flag: '🇬🇫', label: 'غيانا الفرنسية' },
  // ── أوقيانوسيا ─────────────────────────────────
  { code: '+61',  flag: '🇦🇺', label: 'أستراليا' },
  { code: '+64',  flag: '🇳🇿', label: 'نيوزيلندا' },
  { code: '+679', flag: '🇫🇯', label: 'فيجي' },
  { code: '+675', flag: '🇵🇬', label: 'بابوا غينيا الجديدة' },
  { code: '+677', flag: '🇸🇧', label: 'جزر سليمان' },
  { code: '+678', flag: '🇻🇺', label: 'فانواتو' },
  { code: '+676', flag: '🇹🇴', label: 'تونغا' },
  { code: '+685', flag: '🇼🇸', label: 'ساموا' },
  { code: '+686', flag: '🇰🇮', label: 'كيريباتي' },
  { code: '+687', flag: '🇳🇨', label: 'كاليدونيا الجديدة' },
  { code: '+689', flag: '🇵🇫', label: 'بولينيزيا الفرنسية' },
  { code: '+690', flag: '🇹🇰', label: 'توكيلاو' },
  { code: '+691', flag: '🇫🇲', label: 'ميكرونيزيا' },
  { code: '+692', flag: '🇲🇭', label: 'جزر مارشال' },
  { code: '+680', flag: '🇵🇼', label: 'بالاو' },
  { code: '+674', flag: '🇳🇷', label: 'ناورو' },
];

const STEPS = [
  { label: 'البيانات الشخصية', icon: '👤' },
  { label: 'كلمة المرور',      icon: '🔒' },
  { label: 'التحقق من الهاتف', icon: '📱' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FieldErrors {
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  familyName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  nationalId?: string;
  bloodType?: string;
  gender?: string;
  password?: string;
  confirmPassword?: string;
  smsOtp?: string;
  username?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    grandfatherName: '',
    familyName: '',
    email: '',
    username: '',
    phonePrefix: '+962',
    phoneNumber: '',
    dateOfBirth: '',
    nationalId: '',
    bloodType: '',
    gender: '' as 'male' | 'female' | '',
    password: '',
    confirmPassword: '',
    smsOtp: '',
    agreeTerms: false,
    role: 'PATIENT',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // SMS state
  const [smsSending, setSmsSending] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OTP digit refs for auto-focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { clearError(); }, [clearError]);
  useEffect(() => {
    if (isAuthenticated && !isLoading) router.push('/patient');
  }, [isAuthenticated, isLoading, router]);

  // Cleanup interval on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fullPhone = () => {
    const raw = formData.phoneNumber.replace(/^0/, '');
    return `${formData.phonePrefix}${raw}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setLocalError(null);
    clearError();
  };

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
      case 'fatherName':
      case 'grandfatherName':
      case 'familyName': {
        const labels: Record<string, string> = {
          firstName: 'الاسم الأول',
          fatherName: 'اسم الأب',
          grandfatherName: 'اسم الجد',
          familyName: 'اسم العائلة',
        };
        if (!value.trim()) return `${labels[name]} مطلوب`;
        if (value.trim().length < 2) return `${labels[name]} يجب أن يكون حرفين على الأقل`;
        if (value.trim().length > 50) return `${labels[name]} طويل جداً`;
        return undefined;
      }
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'البريد الإلكتروني غير صحيح';
        return undefined;
      case 'username':
        if (!value.trim()) return 'اسم المستخدم مطلوب';
        if (value.trim().length < 3) return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
        if (value.trim().length > 30) return 'اسم المستخدم طويل جداً';
        if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return 'يجب أن يحتوي على حروف إنجليزية وأرقام وشرطة سفلية فقط';
        return undefined;
      case 'phoneNumber':
        if (!value.trim()) return 'رقم الهاتف مطلوب';
        if (!/^[0-9]{7,12}$/.test(value.replace(/^0/, ''))) return 'رقم الهاتف غير صحيح';
        return undefined;
      case 'dateOfBirth': {
        if (!value) return 'تاريخ الميلاد مطلوب';
        const dob = new Date(value);
        if (isNaN(dob.getTime())) return 'تاريخ الميلاد غير صحيح';
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dob > today) return 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age > 120) return 'تاريخ الميلاد غير صحيح';
        return undefined;
      }
      case 'nationalId':
        if (!value.trim()) return 'رقم الهوية مطلوب';
        if (value.trim().length < 5) return 'رقم الهوية يجب أن يكون 5 أرقام على الأقل';
        if (value.trim().length > 20) return 'رقم الهوية طويل جداً';
        if (!/^[A-Za-z0-9]+$/.test(value.trim())) return 'يجب أن يحتوي على أرقام وحروف فقط';
        return undefined;
      case 'bloodType':
        if (!value) return 'زمرة الدم مطلوبة';
        return undefined;
      case 'gender':
        if (!value) return 'الجنس مطلوب';
        return undefined;
      case 'password':
        if (!value) return 'كلمة المرور مطلوبة';
        if (value.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        return undefined;
      case 'confirmPassword':
        if (!value) return 'تأكيد كلمة المرور مطلوب';
        if (value !== formData.password) return 'كلمات المرور غير متطابقة';
        return undefined;
      case 'smsOtp':
        if (!value || value.length !== 6) return 'رمز التحقق يجب أن يكون 6 أرقام';
        if (!/^\d{6}$/.test(value)) return 'رمز التحقق يحتوي على أرقام فقط';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateStep = (s: number): boolean => {
    const step1Fields = ['firstName', 'fatherName', 'grandfatherName', 'familyName', 'phoneNumber', 'dateOfBirth', 'nationalId', 'bloodType', 'gender'];
    const step2Fields = ['username', 'password', 'confirmPassword'];

    const fields = s === 1 ? step1Fields : s === 2 ? step2Fields : [];
    const errors: FieldErrors = {};
    let valid = true;

    for (const field of fields) {
      const val = formData[field as keyof typeof formData] as string;
      const err = validateField(field, val);
      if (err) { errors[field as keyof FieldErrors] = err; valid = false; }
    }

    if (s === 2 && !formData.agreeTerms) {
      setLocalError('يجب الموافقة على شروط الخدمة');
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors(errors);
    if (!valid) setLocalError('يرجى تصحيح الأخطاء أدناه');
    return valid;
  };

  // ── SMS ────────────────────────────────────────────────────────────────────

  const startCountdown = (seconds: number) => {
    setSmsCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSmsCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendSmsCode = async () => {
    setSmsSending(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/auth/send-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل إرسال الرمز');
      startCountdown(60);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'فشل إرسال الرمز');
    } finally {
      setSmsSending(false);
    }
  };

  // ── OTP input handler ──────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const digits = formData.smsOtp.split('');
    digits[index] = value;
    const newOtp = digits.join('').slice(0, 6);
    setFormData((prev) => ({ ...prev, smsOtp: newOtp }));
    setFieldErrors((prev) => ({ ...prev, smsOtp: undefined }));
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !formData.smsOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToStep2 = () => {
    if (!validateStep(1)) return;
    setLocalError(null);
    setStep(2);
  };

  const goToStep3 = async () => {
    if (!validateStep(2)) return;
    setLocalError(null);
    setStep(3);
    // Auto-send SMS on reaching step 3
    await sendSmsCode();
  };

  const goBack = () => {
    setLocalError(null);
    setStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev));
  };

  // ── Final submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpErr = validateField('smsOtp', formData.smsOtp);
    if (otpErr) { setFieldErrors((prev) => ({ ...prev, smsOtp: otpErr })); return; }

    setIsSubmitting(true);
    try {
      const signupData: SignupData = {
        firstName: formData.firstName.trim(),
        fatherName: formData.fatherName.trim(),
        grandfatherName: formData.grandfatherName.trim(),
        familyName: formData.familyName.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        phoneNumber: fullPhone(),
        dateOfBirth: formData.dateOfBirth,
        nationalId: formData.nationalId.trim(),
        bloodType: formData.bloodType,
        gender: formData.gender as 'male' | 'female',
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        smsOtp: formData.smsOtp,
        role: formData.role as 'PATIENT' | 'DOCTOR',
      };
      await signup(signupData);
      router.push('/patient');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-3 bg-secondary/30 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right ${
      fieldErrors[field] ? 'border-destructive bg-destructive/5' : 'border-border'
    }`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12 min-h-screen">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-border">

          {/* ── Logo ── */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg mb-3">
              <span className="text-2xl">🦷</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">DenClinic</h1>
            <p className="text-sm text-muted-foreground mt-1">إنشاء حساب جديد</p>
          </div>

          {/* ── Step Indicator ── */}
          <div className="flex items-center justify-center gap-0 mb-8" dir="ltr">
            {STEPS.map((s, i) => {
              const num = i + 1;
              const isActive = step === num;
              const isDone = step > num;
              return (
                <div key={num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isDone
                          ? 'bg-primary text-white'
                          : isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                          : 'bg-secondary/50 text-muted-foreground'
                      }`}
                    >
                      {isDone ? '✓' : s.icon}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-1 mb-4 transition-all duration-300 ${step > num ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Error Banner ── */}
          {displayError && (
            <div className="mb-5 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive text-right">{displayError}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════
               STEP 1 — Personal details
          ══════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5" dir="rtl">
              {/* Name grid */}
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">الاسم الرباعي</h2>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['firstName',      'الاسم الأول',  'محمد'],
                    ['fatherName',     'اسم الأب',     'أحمد'],
                    ['grandfatherName','اسم الجد',      'خالد'],
                    ['familyName',     'اسم العائلة',  'العمري'],
                  ] as [keyof FieldErrors, string, string][]).map(([field, label, ph]) => (
                    <div key={field}>
                      <label htmlFor={field} className="block text-sm font-semibold text-foreground mb-1">
                        {label} <span className="text-destructive">*</span>
                      </label>
                      <input
                        id={field} name={field} type="text"
                        value={formData[field as keyof typeof formData] as string}
                        onChange={handleChange} onBlur={handleBlur} placeholder={ph}
                        className={inputClass(field)}
                      />
                      {fieldErrors[field] && <p className="text-xs text-destructive mt-1">{fieldErrors[field]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">بيانات التواصل</h2>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1">
                      البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري)</span>
                    </label>
                    <input id="email" name="email" type="email" value={formData.email}
                      onChange={handleChange} onBlur={handleBlur} placeholder="example@email.com"
                      className={inputClass('email')} />
                    {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-semibold text-foreground mb-1">
                      رقم الهاتف <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select name="phonePrefix" value={formData.phonePrefix} onChange={handleChange}
                        className="px-3 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-[110px]">
                        {PHONE_PREFIXES.map((p) => (
                          <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                        ))}
                      </select>
                      <input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber}
                        onChange={handleChange} onBlur={handleBlur} placeholder="791234567"
                        className={`flex-1 px-4 py-3 bg-secondary/30 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-left ${fieldErrors.phoneNumber ? 'border-destructive bg-destructive/5' : 'border-border'}`}
                        dir="ltr" />
                    </div>
                    {fieldErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.phoneNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Personal info */}
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">البيانات الشخصية</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-foreground mb-1">
                      تاريخ الميلاد <span className="text-destructive">*</span>
                    </label>
                    <input id="dateOfBirth" name="dateOfBirth" type="date" max={new Date().toISOString().split('T')[0]} value={formData.dateOfBirth}
                      onChange={handleChange} onBlur={handleBlur}
                      className={`${inputClass('dateOfBirth')} text-left`} />
                    {fieldErrors.dateOfBirth && <p className="text-xs text-destructive mt-1">{fieldErrors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-foreground mb-1">
                      الجنس <span className="text-destructive">*</span>
                    </label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange} onBlur={handleBlur}
                      className={inputClass('gender')}>
                      <option value="">اختر الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                    {fieldErrors.gender && <p className="text-xs text-destructive mt-1">{fieldErrors.gender}</p>}
                  </div>
                  <div>
                    <label htmlFor="nationalId" className="block text-sm font-semibold text-foreground mb-1">
                      رقم الهوية <span className="text-destructive">*</span>
                    </label>
                    <input id="nationalId" name="nationalId" type="text" value={formData.nationalId}
                      onChange={handleChange} onBlur={handleBlur} placeholder="1234567890"
                      className={`${inputClass('nationalId')} text-left`} dir="ltr" />
                    {fieldErrors.nationalId && <p className="text-xs text-destructive mt-1">{fieldErrors.nationalId}</p>}
                  </div>
                  <div>
                    <label htmlFor="bloodType" className="block text-sm font-semibold text-foreground mb-1">
                      زمرة الدم <span className="text-destructive">*</span>
                    </label>
                    <select id="bloodType" name="bloodType" value={formData.bloodType} onChange={handleChange} onBlur={handleBlur}
                      className={inputClass('bloodType')}>
                      <option value="">اختر زمرة الدم</option>
                      {BLOOD_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                    {fieldErrors.bloodType && <p className="text-xs text-destructive mt-1">{fieldErrors.bloodType}</p>}
                  </div>
                </div>
              </div>

              <button type="button" onClick={goToStep2}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                التالي ←
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════
               STEP 2 — Password
          ══════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5" dir="rtl">
              <div className="p-4 bg-secondary/20 rounded-xl text-sm text-muted-foreground text-right">
                <p className="font-semibold text-foreground mb-1">اختر كلمة مرور قوية تحتوي على:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>8 أحرف على الأقل</li>
                  <li>حروف وأرقام</li>
                  <li>لا تشاركها مع أحد</li>
                </ul>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-1">
                  اسم المستخدم <span className="text-destructive">*</span>
                </label>
                <input id="username" name="username" type="text" value={formData.username}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="مثال: ahmed_2025"
                  className={inputClass('username')} dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">يجب أن يحتوي على حروف إنجليزية وأرقام وشرطة سفلية فقط</p>
                {fieldErrors.username && <p className="text-xs text-destructive mt-1">{fieldErrors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1">
                  كلمة المرور <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    value={formData.password} onChange={handleChange} onBlur={handleBlur}
                    placeholder="أدخل كلمة المرور"
                    className={`${inputClass('password')} pl-10`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {/* Strength bar */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((lvl) => {
                        const strength = [
                          formData.password.length >= 8,
                          /[A-Z]/.test(formData.password),
                          /[0-9]/.test(formData.password),
                          /[^A-Za-z0-9]/.test(formData.password),
                        ].filter(Boolean).length;
                        return (
                          <div key={lvl} className={`h-1 flex-1 rounded-full transition-all ${
                            lvl <= strength
                              ? strength <= 1 ? 'bg-destructive'
                              : strength === 2 ? 'bg-yellow-400'
                              : strength === 3 ? 'bg-blue-400'
                              : 'bg-green-500'
                              : 'bg-border'
                          }`} />
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const s = [
                          formData.password.length >= 8,
                          /[A-Z]/.test(formData.password),
                          /[0-9]/.test(formData.password),
                          /[^A-Za-z0-9]/.test(formData.password),
                        ].filter(Boolean).length;
                        return s <= 1 ? 'ضعيفة' : s === 2 ? 'متوسطة' : s === 3 ? 'جيدة' : 'قوية جداً';
                      })()}
                    </p>
                  </div>
                )}
                {fieldErrors.password && <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-1">
                  تأكيد كلمة المرور <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                    placeholder="أعد إدخال كلمة المرور"
                    className={`${inputClass('confirmPassword')} pl-10`} />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {/* Match indicator */}
                {formData.confirmPassword && (
                  <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-destructive'}`}>
                    {formData.password === formData.confirmPassword ? '✓ كلمتا المرور متطابقتان' : '✗ كلمتا المرور غير متطابقتين'}
                  </p>
                )}
                {fieldErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.agreeTerms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agreeTerms: e.target.checked }))}
                  className="w-5 h-5 rounded border-border accent-primary" />
                <span className="text-sm text-muted-foreground">
                  أوافق على{' '}
                  <Link href="#" className="text-primary hover:underline">شروط الخدمة</Link>
                  {' '}و{' '}
                  <Link href="#" className="text-primary hover:underline">سياسة الخصوصية</Link>
                </span>
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={goBack}
                  className="flex-1 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-secondary/30 transition-all">
                  → رجوع
                </button>
                <button type="button" onClick={goToStep3}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
                  التالي ←
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
               STEP 3 — SMS Verification
          ══════════════════════════════════════════════ */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  تم إرسال رمز مكوّن من <strong>6 أرقام</strong> إلى
                </p>
                <p className="font-semibold text-foreground mt-1 text-lg" dir="ltr">{fullPhone()}</p>
                <p className="text-xs text-muted-foreground mt-1">أدخل الرمز خلال 10 دقائق</p>
              </div>

              {/* OTP boxes */}
              <div>
                <div className="flex justify-center gap-2" dir="ltr">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={formData.smsOtp[i] ?? ''}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        fieldErrors.smsOtp ? 'border-destructive bg-destructive/5' : formData.smsOtp[i] ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'
                      }`}
                    />
                  ))}
                </div>
                {fieldErrors.smsOtp && (
                  <p className="text-xs text-destructive mt-2 text-center">{fieldErrors.smsOtp}</p>
                )}
              </div>

              {/* Resend */}
              <div className="text-center">
                {smsCountdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    يمكنك إعادة الإرسال بعد{' '}
                    <span className="font-bold text-primary tabular-nums">{smsCountdown}</span> ثانية
                  </p>
                ) : (
                  <button type="button" onClick={sendSmsCode} disabled={smsSending}
                    className="text-sm text-primary hover:underline disabled:opacity-50 font-semibold">
                    {smsSending ? (
                      <span className="flex items-center gap-1 justify-center">
                        <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                        جاري الإرسال...
                      </span>
                    ) : 'إعادة إرسال الرمز'}
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={goBack}
                  className="flex-1 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-secondary/30 transition-all">
                  → رجوع
                </button>
                <button type="submit" disabled={isSubmitting || isLoading || formData.smsOtp.length < 6}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : 'إنشاء الحساب ✓'}
                </button>
              </div>
            </form>
          )}

          {/* ── Footer ── */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            هل لديك حساب بالفعل؟{' '}
            <Link href="/auth/signin" className="text-primary font-semibold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
