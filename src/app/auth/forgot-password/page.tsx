'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'حدث خطأ في إرسال طلب إعادة التعيين');
        return;
      }

      setSubmitted(true);
      if (data.debugToken) {
        // In development, show the token for testing
        console.log('Debug token:', data.debugToken);
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">تم الإرسال بنجاح</h1>

          <p className="text-center text-gray-600 mb-6">
            تقديم طلب إعادة تعيين كلمة المرور إلى <strong>{email}</strong>
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              إذا كان لديك حساب بهذا البريد الإلكتروني، ستتلقى رابط إعادة التعيين. قد يستغرق بضع دقائق لوصول البريد.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              لم تستقبل البريد؟ تحقق من مجلد البريد العشوائي (Spam) أو{' '}
              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                حاول مرة أخرى
              </button>
            </p>
          </div>

          <Link
            href="/auth/signin"
            className="mt-8 flex items-center justify-center w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <Link
          href="/auth/signin"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          العودة
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">هل نسيت كلمة المرور؟</h1>
        <p className="text-gray-600 mb-6">
          أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          تتذكر كلمة المرور؟{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
