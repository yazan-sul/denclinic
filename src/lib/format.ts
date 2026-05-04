// Two-digit country codes (must be checked before 3-digit)
const CC2 = ['20']; // Egypt
// Three-digit country codes (MENA region)
const CC3 = ['970', '966', '962', '963', '964', '965', '967', '968', '971', '972', '973', '974', '218', '213', '216', '212'];

export function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  // Strip leading trunk 0 (e.g. Egypt 0201... → 201...)
  if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }

  for (const cc of CC2) {
    if (digits.startsWith(cc)) {
      const rest = digits.slice(cc.length);
      if (rest.length >= 6) {
        const a = rest.slice(0, 2);
        const b = rest.slice(2, 5);
        const c = rest.slice(5);
        return c ? `+${cc}-${a}-${b}-${c}` : `+${cc}-${a}-${b}`;
      }
      return `+${cc}-${rest}`;
    }
  }

  for (const cc of CC3) {
    if (digits.startsWith(cc)) {
      const rest = digits.slice(cc.length);
      if (rest.length >= 6) {
        const a = rest.slice(0, 2);
        const b = rest.slice(2, 5);
        const c = rest.slice(5);
        return c ? `+${cc}-${a}-${b}-${c}` : `+${cc}-${a}-${b}`;
      }
      return `+${cc}-${rest}`;
    }
  }

  // Fallback: just ensure + prefix
  return phone.startsWith('+') ? phone : `+${phone}`;
}