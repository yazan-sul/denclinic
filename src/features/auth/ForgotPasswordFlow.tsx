'use client';

import { FormEvent, useState } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import OTPInput from '@/components/ui/OTPInput';
import PasswordResetModal from '@/features/auth/PasswordResetModal';
import {
  requestPasswordReset,
  verifyPasswordResetCode,
} from '@/services/api/auth';

interface ForgotPasswordFlowProps {
  onComplete?: (message: string) => void;
}

export default function ForgotPasswordFlow({ onComplete }: ForgotPasswordFlowProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setEmailError('');
    setError('');
    setMessage('');

    if (!email.trim()) {
      setEmailError('Enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      const verified = await verifyPasswordResetCode({
        email: email.trim(),
        code,
      });
      setVerifiedToken(verified.token);
      setIsResetOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSuccess = (successMessage: string) => {
    setIsResetOpen(false);
    setEmail('');
    setCode('');
    setVerifiedToken('');
    setStep('email');
    setMessage('');
    onComplete?.(successMessage || 'Password updated successfully.');
  };

  return (
    <div className="space-y-5" dir="rtl">
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <FormField
            id="forgot-email"
            label="Email"
            error={emailError}
            helper="We will send a 6-digit verification code to your email."
          >
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError('');
                  setError('');
                }}
                disabled={isSubmitting}
                placeholder="name@example.com"
                dir="ltr"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground transition focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </FormField>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            {message || 'Enter the 6-digit code sent to your email.'}
          </div>

          <FormField
            label="Verification Code"
            error={error}
            helper="Enter the 6-digit code."
          >
            <OTPInput value={code} onChange={setCode} disabled={isSubmitting} error={!!error} />
          </FormField>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Change Email
            </button>
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      )}

      <PasswordResetModal
        isOpen={isResetOpen}
        email={email.trim()}
        resetToken={verifiedToken}
        onClose={() => setIsResetOpen(false)}
        onSuccess={handleResetSuccess}
      />
    </div>
  );
}
