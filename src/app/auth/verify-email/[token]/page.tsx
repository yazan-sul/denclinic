'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailPage({ params, searchParams }: { params: Promise<{ token?: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const router = useRouter();
  const searchParamsSync = useSearchParams();
  const { verifyEmail } = useAuth();

  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('جاري التحقق من البريد الإلكتروني...');
  const [email, setEmail] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      const resolvedSearchParams = await searchParams;
      const resolvedToken = resolvedParams?.token || (resolvedSearchParams.token as string) || '';
      setToken(resolvedToken);
      if (resolvedToken && status === 'loading') {
        verifyEmailToken(resolvedToken);
      }
    })();
  }, []);

  const verifyEmailToken = async (tokenToVerify: string) => {
    try {
      await verifyEmail(tokenToVerify);
      setStatus('success');
      setMessage('تم التحقق من البريد الإلكتروني بنجاح! 🎉');

      // Redirect to patient dashboard after 3 seconds
      setTimeout(() => {
        router.push('/patient');
      }, 3000);
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'فشل التحقق من البريد الإلكتروني';
      setMessage(errorMessage);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken) {
      setMessage('يرجى إدخال الرمز');
      return;
    }
    setStatus('loading');
    await verifyEmailToken(manualToken);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-6">
              <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">جاري التحقق...</h1>
            <p className="text-center text-gray-600 mb-8">{message}</p>

            {!token && (
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                {showManualForm ? 'إخفاء النموذج' : 'إدخال الرمز يدويًا'}
              </button>
            )}

            {showManualForm && (
              <form onSubmit={handleManualSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="أدخل رمز التحقق"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                >
                  التحقق
                </button>
              </form>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">تم بنجاح!</h1>
            <p className="text-center text-gray-600 mb-8">{message}</p>

            <p className="text-center text-gray-500 text-sm mb-6">
              جاري تحويلك إلى لوحة التحكم...
            </p>

            <Link
              href="/patient"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-center transition"
            >
              الذهاب إلى لوحة التحكم
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">حدث خطأ</h1>
            <p className="text-center text-red-600 mb-8">{message}</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setStatus('loading');
                  setShowManualForm(true);
                  setMessage('أدخل الرمز أعلاه للتحقق من البريد');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                محاولة أخرى
              </button>

              <Link
                href="/auth/signin"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg text-center transition"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>

            <p className="text-center text-gray-600 text-sm mt-6">
              لم تستقبل الرمز؟{' '}
              <button
                onClick={() => {
                  // In production, send new verification email
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                إرسال رمز جديد
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
