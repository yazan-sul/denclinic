'use client';

import Modal from '@/components/ui/Modal';
import NewPasswordForm from '@/features/auth/NewPasswordForm';
import { resetPasswordWithToken } from '@/services/api/auth';

interface PasswordResetModalProps {
  isOpen: boolean;
  email: string;
  resetToken: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function PasswordResetModal({
  isOpen,
  email,
  resetToken,
  onClose,
  onSuccess,
}: PasswordResetModalProps) {
  const handleSubmit = async (newPassword: string) => {
    const message = await resetPasswordWithToken(email, resetToken, newPassword);
    onSuccess(message);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Password"
      subtitle="Choose a new password for your account."
      size="md"
    >
      <NewPasswordForm onSubmit={handleSubmit} />
    </Modal>
  );
}
