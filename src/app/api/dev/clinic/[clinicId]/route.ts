import { NextRequest, NextResponse } from 'next/server';
import { MOCK_BRANCHES, MOCK_CLINICS, MOCK_RATINGS, MOCK_SERVICES, MOCK_USERS } from '@/lib/mockData';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateClinicId } from '@/lib/validators';
import { applySandboxHeaders, createSandboxForbiddenResponse, isSandboxEnabled } from '@/lib/apiMode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    if (!isSandboxEnabled()) {
      return createSandboxForbiddenResponse();
    }

    const { clinicId: clinicIdStr } = await params;
    const clinicId = validateClinicId({ clinicId: clinicIdStr });

    const clinic = MOCK_CLINICS.find((c) => c.id === clinicId);
    if (!clinic) {
      throw new NotFoundError('Clinic not found');
    }

    const branches = MOCK_BRANCHES.filter((b) => b.clinicId === clinicId).map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      latitude: branch.latitude,
      longitude: branch.longitude,
    }));

    const services = MOCK_SERVICES.filter((s) => s.clinicId === clinicId).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      icon: service.icon,
    }));

    const ratings = MOCK_RATINGS.filter((r) => r.clinicId === clinicId).map((rating) => ({
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      user: {
        name: MOCK_USERS.find((u) => u.id === rating.userId)?.name || 'مستخدم',
      },
    }));

    return applySandboxHeaders(
      NextResponse.json({
        success: true,
        data: {
          ...clinic,
          branches,
          services,
          ratings,
        },
        sandbox: true,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
