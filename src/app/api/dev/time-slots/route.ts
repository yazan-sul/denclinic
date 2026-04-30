import { NextRequest, NextResponse } from 'next/server';
import { MOCK_SLOTS } from '@/lib/mockData';
import { handleApiError } from '@/lib/errors';
import { timeSlotsSchema } from '@/lib/validators';
import { applySandboxHeaders, createSandboxForbiddenResponse, isSandboxEnabled } from '@/lib/apiMode';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    if (!isSandboxEnabled()) {
      return createSandboxForbiddenResponse();
    }

    const { searchParams } = new URL(request.url);

    const validated = timeSlotsSchema.parse({
      branchId: searchParams.get('branchId'),
      doctorId: searchParams.get('doctorId') || undefined,
      date: searchParams.get('date'),
    });

    const { branchId, doctorId, date } = validated;

    const dateObj = new Date(date);
    const endDate = new Date(dateObj);
    endDate.setDate(endDate.getDate() + 1);

    const slots = MOCK_SLOTS.filter((slot) => {
      const slotDate = new Date(slot.date);
      const branchMatch = slot.branchId === branchId;
      const doctorMatch = doctorId ? slot.doctorId === doctorId : true;
      const dateMatch = slotDate >= dateObj && slotDate < endDate;
      return branchMatch && doctorMatch && dateMatch && slot.available;
    }).map((slot) => ({
      id: slot.id,
      date: slot.date,
      time: slot.time,
      available: slot.available,
    }));

    return applySandboxHeaders(
      NextResponse.json({
        success: true,
        data: slots,
        sandbox: true,
      })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      const message = (firstError as any)?.message || 'بيانات غير صحيحة';
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
