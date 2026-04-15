'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, SignupData } from '@/context/AuthContext';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PHONE_PREFIXES = [
  { code: '+966', flag: '🇸🇦', label: 'السعودية' },
  { code: '+962', flag: '🇯🇴', label: 'الأردن' },
  { code: '+971', flag: '🇦🇪', label: 'الإمارات' },
  { code: '+970', flag: '🇵🇸', label: 'فلسطين' },
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
];

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
}

export default function SignUpPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    grandfatherName: '',
    familyName: '',
    email: '',
    phonePrefix: '+962',
    phoneNumber: '',
    dateOfBirth: '',
    nationalId: '',
    bloodType: '',
    gender: '' as 'male' | 'female' | '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { clearError(); }, [clearError]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/patient');
    }
  }, [isAuthenticated, isLoading, router]);

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
        if (!value.trim()) return 'البريد الإلكتروني مطلوب';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'البريد الإلكتروني غير صحيح';
        return undefined;
      case 'phoneNumber':
        if (!value.trim()) return 'رقم الهاتف مطلوب';
        if (!/^[0-9]{7,12}$/.test(value.replace(/^0/, ''))) return 'رقم الهاتف غير صحيح';
        return undefined;
      case 'dateOfBirth': {
        if (!value) return 'تاريخ الميلاد مطلوب';
        const dob = new Date(value);
        if (isNaN(dob.getTime())) return 'تاريخ الميلاد غير صحيح';
        if (dob >= new Date()) return 'تاريخ الميلاد يجب أن يكون في الماضي';
        const age = (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 1 || age > 120) return 'تاريخ الميلاد غير صحيح';
        return undefined;
      }
      case 'nationalId':
        if (!value.trim()) return 'رقم الهوية مطلوب';
        if (value.trim().length < 5) return 'رقم الهوية يجب أن يكون 5 أرقام على الأقل';
        if (value.trim().length > 20) return 'رقم الهوية طويل جداً';
        if (!/^[A-Za-z0-9]+$/.test(value.trim())) return 'رقم الهوية يجب أن يحتوي على أرقام وحروف فقط';
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
      default:
        return undefined;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const validateAll = (): boolean => {
    const fields = [
      'firstName', 'fatherName', 'grandfatherName', 'familyName',
      'email', 'phoneNumber', 'dateOfBirth', 'nationalId',
      'bloodType', 'gender', 'password', 'confirmPassword',
    ];
    const errors: FieldErrors = {};
    let valid = true;
    for (const field of fields) {
      const val = formData[field as keyof typeof formData] as string;
      const err = validateField(field, val);
      if (err) {
        errors[field as keyof FieldErrors] = err;
        valid = false;
      }
    }
    setFieldErrors(errors);
    if (!valid) { setLocalError('يرجى تصحيح الأخطاء أدناه'); return false; }
    if (!agreeTerms) { setLocalError('يجب الموافقة على شروط الخدمة ليتم إنشاء الحساب'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const rawPhone = formData.phoneNumber.replace(/^0/, '');
      const signupData: SignupData = {
        firstName: formData.firstName.trim(),
        fatherName: formData.fatherName.trim(),
        grandfatherName: formData.grandfatherName.trim(),
        familyName: formData.familyName.trim(),
        email: formData.email.trim(),
        phoneNumber: `${formData.phonePrefix}${rawPhone}`,
        dateOfBirth: formData.dateOfBirth,
        nationalId: formData.nationalId.trim(),
        bloodType: formData.bloodType,
        gender: formData.gender as 'male' | 'female',
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role as 'PATIENT' | 'DOCTOR',
      };
      await signup(signupData);
      router.push('/patient');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الحساب';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-3 bg-secondary/30 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right ${
      fieldErrors[field] ? 'border-destructive bg-destructive/5' : 'border-border'
    }`;

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg mb-4">
              <span className="text-3xl">🦷</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">DenClinic</h1>
            <p className="text-muted-foreground">إنشاء حساب جديد</p>
          </div>

          {/* Global Error */}
          {displayError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive text-right">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">

            {/* ── Name Section ── */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">الاسم الرباعي</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-foreground mb-1">
                    الاسم الأول <span className="text-destructive">*</span>
                  </label>
                  <input id="firstName" name="firstName" type="text" value={formData.firstName}
                    onChange={handleChange} onBlur={handleBlur} placeholder="محمد"
                    className={inputClass('firstName')} disabled={isSubmitting || isLoading} />
                  {fieldErrors.firstName && <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="fatherName" className="block text-sm font-semibold text-foreground mb-1">
                    اسم الأب <span className="text-destructive">*</span>
                  </label>
                  <input id="fatherName" name="fatherName" type="text" value={formData.fatherName}
                    onChange={handleChange} onBlur={handleBlur} placeholder="أحمد"
                    className={inputClass('fatherName')} disabled={isSubmitting || isLoading} />
                  {fieldErrors.fatherName && <p className="text-xs text-destructive mt-1">{fieldErrors.fatherName}</p>}
                </div>
                <div>
                  <label htmlFor="grandfatherName" className="block text-sm font-semibold text-foreground mb-1">
                    اسم الجد <span className="text-destructive">*</span>
                  </label>
                  <input id="grandfatherName" name="grandfatherName" type="text" value={formData.grandfatherName}
                    onChange={handleChange} onBlur={handleBlur} placeholder="خالد"
                    className={inputClass('grandfatherName')} disabled={isSubmitting || isLoading} />
                  {fieldErrors.grandfatherName && <p className="text-xs text-destructive mt-1">{fieldErrors.grandfatherName}</p>}
                </div>
                <div>
                  <label htmlFor="familyName" className="block text-sm font-semibold text-foreground mb-1">
                    اسم العائلة <span className="text-destructive">*</span>
                  </label>
                  <input id="familyName" name="familyName" type="text" value={formData.familyName}
                    onChange={handleChange} onBlur={handleBlur} placeholder="العمري"
                    className={inputClass('familyName')} disabled={isSubmitting || isLoading} />
                  {fieldErrors.familyName && <p className="text-xs text-destructive mt-1">{fieldErrors.familyName}</p>}
                </div>
              </div>
            </div>

            {/* ── Contact Info Section ── */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">بيانات التواصل</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1">
                    البريد الإلكتروني <span className="text-destructive">*</span>
                  </label>
                  <input id="email" name="email" type="email" value={formData.email}
                    onChange={handleChange} onBlur={handleBlur} placeholder="example@email.com"
                    className={inputClass('email')} disabled={isSubmitting || isLoading} />
                  {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-foreground mb-1">
                    رقم الهاتف <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select name="phonePrefix" value={formData.phonePrefix} onChange={handleChange}
                      className="px-3 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-[110px]"
                      disabled={isSubmitting || isLoading}>
                      {PHONE_PREFIXES.map((p) => (
                        <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                      ))}
                    </select>
                    <input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber}
                      onChange={handleChange} onBlur={handleBlur} placeholder="791234567"
                      className={`flex-1 px-4 py-3 bg-secondary/30 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-left ${fieldErrors.phoneNumber ? 'border-destructive bg-destructive/5' : 'border-border'}`}
                      dir="ltr" disabled={isSubmitting || isLoading} />
                  </div>
                  {fieldErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.phoneNumber}</p>}
                </div>
              </div>
            </div>

            {/* ── Personal Info Section ── */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">البيانات الشخصية</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-foreground mb-1">
                    تاريخ الميلاد <span className="text-destructive">*</span>
                  </label>
                  <input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth}
                    onChange={handleChange} onBlur={handleBlur}
                    max={new Date().toISOString().split('T')[0]}
                    className={`${inputClass('dateOfBirth')} text-left`} disabled={isSubmitting || isLoading} />
                  {fieldErrors.dateOfBirth && <p className="text-xs text-destructive mt-1">{fieldErrors.dateOfBirth}</p>}
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-foreground mb-1">
                    الجنس <span className="text-destructive">*</span>
                  </label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} onBlur={handleBlur}
                    className={inputClass('gender')} disabled={isSubmitting || isLoading}>
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
                    className={`${inputClass('nationalId')} text-left`} dir="ltr" disabled={isSubmitting || isLoading} />
                  {fieldErrors.nationalId && <p className="text-xs text-destructive mt-1">{fieldErrors.nationalId}</p>}
                </div>
                <div>
                  <label htmlFor="bloodType" className="block text-sm font-semibold text-foreground mb-1">
                    زمرة الدم <span className="text-destructive">*</span>
                  </label>
                  <select id="bloodType" name="bloodType" value={formData.bloodType} onChange={handleChange} onBlur={handleBlur}
                    className={inputClass('bloodType')} disabled={isSubmitting || isLoading}>
                    <option value="">اختر زمرة الدم</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                  {fieldErrors.bloodType && <p className="text-xs text-destructive mt-1">{fieldErrors.bloodType}</p>}
                </div>
              </div>
            </div>

            {/* ── Password Section ── */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">كلمة المرور</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1">
                    كلمة المرور <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      value={formData.password} onChange={handleChange} onBlur={handleBlur}
                      placeholder="8 أحرف على الأقل"
                      className={`${inputClass('password')} pl-10`} disabled={isSubmitting || isLoading} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-1">
                    تأكيد كلمة المرور <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                      placeholder="أدخل كلمة المرور مرة أخرى"
                      className={`${inputClass('confirmPassword')} pl-10`} disabled={isSubmitting || isLoading} />
                    <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">
                      {showConfirmPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded border-border accent-primary" disabled={isSubmitting || isLoading} />
              <span className="text-sm text-muted-foreground">
                أوافق على{' '}
                <Link href="#" className="text-primary hover:underline">شروط الخدمة</Link>
                {' '}و{' '}
                <Link href="#" className="text-primary hover:underline">سياسة الخصوصية</Link>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting || isLoading}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري الإنشاء...
                </>
              ) : 'إنشاء حساب جديد'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6 text-muted-foreground">
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
