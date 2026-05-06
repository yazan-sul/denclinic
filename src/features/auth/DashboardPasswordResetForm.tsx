'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/services/api/auth';

interface DashboardPasswordResetFormProps {
  onSuccess?: () => void;
}

export default function DashboardPasswordResetForm({ onSuccess }: DashboardPasswordResetFormProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!currentPassword) {
      setError('كلمة المرور الحالية مطلوبة');
      return;
    }

    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة');
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await changePassword({
        identifier: user?.email,
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(message);
      onSuccess?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      {successMessage && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <PasswordInput
        id="dashboard-current-password"
        label="كلمة المرور الحالية"
        value={currentPassword}
        onChange={(value) => {
          setCurrentPassword(value);
          setError('');
        }}
        disabled={isSubmitting}
        autoComplete="current-password"
      />
      <PasswordInput
        id="dashboard-new-password"
        label="كلمة المرور الجديدة"
        value={newPassword}
        onChange={(value) => {
          setNewPassword(value);
          setError('');
        }}
        helper="8 أحرف على الأقل"
        disabled={isSubmitting}
        autoComplete="new-password"
      />
      <PasswordInput
        id="dashboard-confirm-password"
        label="تأكيد كلمة المرور"
        value={confirmPassword}
        onChange={(value) => {
          setConfirmPassword(value);
          setError('');
        }}
        disabled={isSubmitting}
        autoComplete="new-password"
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
        className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isSubmitting ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
      </button>
    </form>
  );
}
