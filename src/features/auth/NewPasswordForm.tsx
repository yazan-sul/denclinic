'use client';

import { FormEvent, useState } from 'react';
import PasswordInput from '@/components/ui/PasswordInput';

interface NewPasswordFormProps {
  onSubmit: (newPassword: string) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

export default function NewPasswordForm({
  onSubmit,
  submitLabel = 'تحديث كلمة المرور',
  disabled,
}: NewPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(password);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <PasswordInput
        id="new-password"
        label="كلمة المرور الجديدة"
        value={password}
        onChange={setPassword}
        helper="8 أحرف على الأقل"
        disabled={disabled || isSubmitting}
        autoComplete="new-password"
      />
      <PasswordInput
        id="confirm-new-password"
        label="تأكيد كلمة المرور"
        value={confirmPassword}
        onChange={setConfirmPassword}
        disabled={disabled || isSubmitting}
        autoComplete="new-password"
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || isSubmitting || !password || !confirmPassword}
        className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'جاري التحديث...' : submitLabel}
      </button>
    </form>
  );
}
