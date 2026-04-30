import { NextResponse } from 'next/server';
import { smsOtpStore } from '@/lib/tokenStorage';
import { z } from 'zod';

const schema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{7,15}$/, 'رقم الهاتف غير صحيح'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber } = schema.parse(body);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    smsOtpStore[phoneNumber] = { otp, expiresAt, verified: false };

    console.log(`\n========================================`);
    console.log(`  📱 OTP for ${phoneNumber}: ${otp}`);
    console.log(`========================================\n`);

    return NextResponse.json({ success: true, message: 'تم إرسال رمز التحقق' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 },
      );
    }
    const msg = error instanceof Error ? error.message : 'حدث خطأ، يرجى المحاولة مجدداً';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

