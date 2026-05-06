'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle } from 'lucide-react';
import ForgotPasswordFlow from '@/features/auth/ForgotPasswordFlow';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg" dir="rtl">
        <Link
          href="/auth/signin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لتسجيل الدخول
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">استعادة كلمة المرور</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أدخل بريدك الإلكتروني، ثم تحقق من الرمز لإعادة تعيين كلمة المرور.
          </p>
        </div>

        {successMessage ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-green-200 bg-green-500/10 p-4 text-sm text-green-700">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5" />
                تم بنجاح
              </div>
              {successMessage}
            </div>
            <button
              type="button"
              onClick={() => router.push('/auth/signin')}
              className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <ForgotPasswordFlow
            onComplete={(message) => {
              setSuccessMessage(message);
              setTimeout(() => router.push('/auth/signin'), 1200);
            }}
          />
        )}
      </div>
    </div>
  );
}
