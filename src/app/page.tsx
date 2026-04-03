'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/patient');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md w-full">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg mb-4">
            <span className="text-5xl">🦷</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            DenClinic
          </h1>
        </div>

        {/* Main Text */}
        <div className="space-y-4 mb-8">
          <p className="text-lg text-muted-foreground leading-relaxed">
            مرحباً بك في تطبيق العيادات
          </p>
          <p className="text-sm text-muted-foreground">
            احجز مواعيدك مع أفضل أطباء الأسنان بضغطة زر واحدة. جودة الخدمة والراحة مضمونة
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-12 text-right">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">✓</span>
            </div>
            <span className="text-foreground">احجز موعدك في ثوانٍ معدودة</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">✓</span>
            </div>
            <span className="text-foreground">تواصل مباشر مع أطباء متخصصين</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">✓</span>
            </div>
            <span className="text-foreground">تتبع حالتك الصحية بسهولة</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth/signup"
            className="block w-full py-3 px-4 bg-white border-2 border-primary text-primary hover:bg-primary/5 rounded-lg font-semibold transition-all duration-300"
          >
            إنشاء حساب جديد
          </Link>
        </div>

        {/* Footer text */}
        <p className="mt-8 text-xs text-muted-foreground">
          باستخدامك للتطبيق، فأنت توافق على{' '}
          <Link href="#" className="text-primary hover:underline">
            شروط الخدمة
          </Link>
          {' '}و{' '}
          <Link href="#" className="text-primary hover:underline">
            سياسة الخصوصية
          </Link>
        </p>
      </div>
    </div>
  );
}
