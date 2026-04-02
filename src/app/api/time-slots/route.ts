import { MOCK_TIME_SLOTS } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { validateTimeSlotsParams } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate parameters
    const { branchId, date, doctorId } = validateTimeSlotsParams({
      branchId: searchParams.get('branchId') || undefined,
      doctorId: searchParams.get('doctorId') || undefined,
      date: searchParams.get('date') || undefined,
    });

    const dateObj = new Date(date);
    const endDate = new Date(dateObj);
    endDate.setDate(endDate.getDate() + 1);

    // Return mock data
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
    return handleApiError(error);
  }
}
