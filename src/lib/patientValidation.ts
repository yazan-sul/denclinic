// Shared validation rules for patient data

export const PHONE_PREFIXES = [
  { code: '970', label: '+970 🇵🇸 فلسطين' },
  { code: '972', label: '+972 فلسطين 48' },
  { code: '962', label: '+962 🇯🇴 الأردن' },
  { code: '966', label: '+966 🇸🇦 السعودية' },
  { code: '20',  label: '+20  🇪🇬 مصر' },
  { code: '971', label: '+971 🇦🇪 الإمارات' },
  { code: '965', label: '+965 🇰🇼 الكويت' },
  { code: '973', label: '+973 🇧🇭 البحرين' },
  { code: '974', label: '+974 🇶🇦 قطر' },
  { code: '218', label: '+218 🇱🇾 ليبيا' },
  { code: '213', label: '+213 🇩🇿 الجزائر' },
  { code: '216', label: '+216 🇹🇳 تونس' },
  { code: '212', label: '+212 🇲🇦 المغرب' },
];

// Combine prefix + local number
export function buildPhone(prefix: string, local: string): string {
  const digits = local.replace(/\D/g, '');
  return `${prefix}${digits}`;
}

// Split stored phone into prefix + local
export function splitPhone(phone: string): { prefix: string; local: string } {
  const clean = phone.replace(/\D/g, '');
  for (const p of [...PHONE_PREFIXES].sort((a, b) => b.code.length - a.code.length)) {
    if (clean.startsWith(p.code)) {
      return { prefix: p.code, local: clean.slice(p.code.length) };
    }
  }
  return { prefix: PHONE_PREFIXES[0].code, local: clean };
}

// National ID: Palestinian ID — exactly 9 digits
export function validateNationalId(id: string): string | null {
  const clean = id.trim();
  if (!clean) return 'رقم الهوية مطلوب';
  if (!/^\d+$/.test(clean)) return 'رقم الهوية يجب أن يحتوي أرقاماً فقط';
  if (clean.length !== 9) return 'رقم الهوية الفلسطينية يجب أن يكون 9 أرقام بالضبط';
  return null;
}

// Phone: local part only 7–10 digits
export function validateLocalPhone(local: string): string | null {
  const digits = local.replace(/\D/g, '');
  if (!digits) return 'رقم الهاتف مطلوب';
  if (digits.length < 7)  return 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل';
  if (digits.length > 10) return 'رقم الهاتف يجب أن لا يتجاوز 10 أرقام';
  return null;
}

// Full name: exactly 4 words, each ≥ 2 chars, letters only
export function validateFullName(name: string): string | null {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 4) return 'يجب إدخال الاسم الرباعي (4 كلمات)';
  if (parts.length > 4) return 'يجب أن لا يتجاوز الاسم 4 كلمات';
  if (parts.some(p => p.length < 2)) return 'كل كلمة في الاسم يجب أن تكون حرفين على الأقل';
  if (parts.some(p => /\d/.test(p)))  return 'يجب ألا يحتوي الاسم على أرقام';
  return null;
}
