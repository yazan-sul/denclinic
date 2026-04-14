import { prisma } from '@/lib/prisma';
import { MOCK_TIME_SLOTS } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { timeSlotsSchema } from '@/lib/validators';
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
          branchId: branchId,
          doctorId: doctorId ? parseInt(doctorId) : undefined,
          date: {
            gte: dateObj,
            lt: endDate,
          },
          available: true,
        },
        select: {
          id: true,
          date: true,
          time: true,
          available: true,
        },
      });

      if (slots.length > 0) {
        return NextResponse.json({ success: true, data: slots });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Return mock data as fallback
    const mockSlots = MOCK_TIME_SLOTS.filter(slot => {
      const slotDate = new Date(slot.date);
      return slot.branchId === branchId && 
             slotDate >= dateObj && 
             slotDate < endDate &&
             slot.available;
    }).map(slot => ({
      id: slot.id,
      date: slot.date,
      time: slot.time,
      available: slot.available,
    }));

    return NextResponse.json({ success: true, data: mockSlots });
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
