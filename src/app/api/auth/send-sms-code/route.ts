import { NextResponse } from 'next/server';
import { smsOtpStore } from '@/lib/tokenStorage';
import { z } from 'zod';

const schema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber } = schema.parse(body);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    smsOtpStore[phoneNumber] = { otp, expiresAt, verified: false };

    return NextResponse.json({ success: true, message: 'Verification code sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? 'Invalid data.' },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
