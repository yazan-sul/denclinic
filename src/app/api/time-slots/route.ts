import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { timeSlotsSchema } from '@/lib/validators';
import { buildDbUnavailableResponse } from '@/lib/apiMode';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate parameters with Zod schema
    const validated = timeSlotsSchema.parse({
      branchId: searchParams.get('branchId'),
      doctorId: searchParams.get('doctorId') || undefined,
      date: searchParams.get('date'),
    });
    
    const { branchId, date, doctorId } = validated;

    const dateObj = new Date(date);
    const endDate = new Date(dateObj);
    endDate.setDate(endDate.getDate() + 1);

    // Try to fetch from database first
    try {
      const slots = await prisma.slot.findMany({
        where: {
          branchId,
          doctorId: doctorId || undefined,
          slotDate: {
            gte: dateObj,
            lt: endDate,
          },
          isAvailable: true,
        },
        select: {
          id: true,
          slotDate: true,
          startTime: true,
          isAvailable: true,
        },
      });

      const normalizedSlots = slots.map(slot => ({
        id: slot.id,
        date: slot.slotDate,
        time: slot.startTime,
        available: slot.isAvailable,
      }));

      return NextResponse.json({ success: true, data: normalizedSlots });
    } catch (dbError) {
      console.log('Database unavailable:', dbError);
      return buildDbUnavailableResponse('خدمة المواعيد', dbError);
    }
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
