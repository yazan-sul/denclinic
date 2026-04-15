'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SignInPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Clear errors when page mounts
    clearError();
  }, [clearError]);

  useEffect(() => {
    // Only redirect if authenticated after page load completes
    if (isAuthenticated && !isLoading) {
      router.push('/patient');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleSignIn = () => {
    // TODO: Implement Google Sign-In
    console.log('Google Sign-In not yet implemented');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setLocalError('يرجى ملء جميع الحقول');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.email, formData.password);
      router.push('/patient');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen">
      {/* Sign In Section */}
      <div className="flex-1 lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"></div>
        </div>

        {/* Form Container */}
        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg mb-4">
              <span className="text-3xl">🦷</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">DenClinic</h1>
            <p className="text-muted-foreground">تسجيل الدخول إلى حسابك</p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive text-right">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل بريدك الإلكتروني"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right"
                disabled={isSubmitting || isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right"
                disabled={isSubmitting || isLoading}
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                هل نسيت كلمة المرور؟
              </Link>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border" />
                <span className="text-muted-foreground">تذكر حسابي</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full cursor-pointer py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري التحميل...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="px-3 text-sm text-muted-foreground">أو</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 border-2 border-border hover:border-primary rounded-lg font-semibold text-foreground transition-all duration-300 flex items-center justify-center gap-2 hover:bg-primary/5"
          >
            <span>🔐</span>
            تسجيل الدخول مع Google
          </button>

          {/* Terms Agreement */}
          <p className="text-center mt-6 text-xs text-muted-foreground">
            By signing in, you agree to our{' '}
            <Link href="#" className="text-primary hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="#" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center mt-6 text-muted-foreground">
            ليس لديك حساب؟{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>

      {/* Welcome Section - Side Panel - Hidden on screens smaller than 980px */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
        </div>

        <div className="text-center text-white max-w-md relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-8 border border-white/30">
            <span className="text-6xl">🦷</span>
          </div>
          <h1 className="text-5xl font-bold mb-6">DenClinic</h1>
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            Your trusted dental care companion. Schedule appointments, manage your dental records, and connect with experienced dentists all in one place. Experience modern dental care at your fingertips.
          </p>
          <button
            onClick={() => router.push('/patient')}
            className="px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all duration-300 shadow-lg"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
