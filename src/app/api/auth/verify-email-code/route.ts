import { NextRequest, NextResponse } from 'next/server';
import { emailOtpStore, verifiedEmailSet } from '@/lib/tokenStorage';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ success: false, message: 'البريد الإلكتروني والرمز مطلوبان' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const entry = emailOtpStore[normalized];

    if (!entry) {
      return NextResponse.json({ success: false, message: 'لم يتم إرسال رمز لهذا البريد، يرجى طلب رمز جديد' }, { status: 400 });
    }

    if (Date.now() > entry.expiresAt) {
      delete emailOtpStore[normalized];
      return NextResponse.json({ success: false, message: 'انتهت صلاحية الرمز، يرجى طلب رمز جديد' }, { status: 400 });
    }

    if (code.trim() !== entry.otp) {
      return NextResponse.json({ success: false, message: 'رمز التحقق غير صحيح' }, { status: 400 });
    }

    // Verified — delete the used code and mark email as verified for 30 min
    delete emailOtpStore[normalized];
    verifiedEmailSet[normalized] = Date.now() + 30 * 60 * 1000;

    return NextResponse.json({ success: true, message: 'تم التحقق من البريد الإلكتروني بنجاح' });
  } catch {
    return NextResponse.json({ success: false, message: 'حدث خطأ، يرجى المحاولة لاحقاً' }, { status: 500 });
  }
}
