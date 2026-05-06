'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import NewPasswordForm from '@/features/auth/NewPasswordForm';
import { resetPasswordWithToken } from '@/services/api/auth';

export default function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      const resolvedSearchParams = await searchParams;
      const queryToken = resolvedSearchParams.token;
      const queryEmail = resolvedSearchParams.email;

      setToken(resolvedParams.token || (Array.isArray(queryToken) ? queryToken[0] : queryToken) || '');
      setEmail((Array.isArray(queryEmail) ? queryEmail[0] : queryEmail) || '');
    })();
  }, [params, searchParams]);

  const handleSubmit = async (newPassword: string) => {
    if (!email) {
      throw new Error('Email is required for this reset link.');
    }

    const message = await resetPasswordWithToken(email, token, newPassword);
    setSuccessMessage(message);
    setTimeout(() => router.push('/auth/signin'), 1200);
  };

  const missingResetData = !token || !email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>

        {missingResetData && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            This reset link is missing required information. Please request a new code from the login page.
          </div>
        )}

        {successMessage ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-green-200 bg-green-500/10 p-4 text-sm text-green-700">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5" />
                Success
              </div>
              {successMessage}
            </div>
            <p className="text-center text-sm text-muted-foreground">Redirecting to sign in...</p>
          </div>
        ) : (
          <NewPasswordForm onSubmit={handleSubmit} disabled={missingResetData} />
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
