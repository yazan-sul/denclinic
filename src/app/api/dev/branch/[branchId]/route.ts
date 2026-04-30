import { NextRequest, NextResponse } from 'next/server';
import { MOCK_BRANCHES, MOCK_CLINICS, MOCK_DOCTORS, MOCK_SERVICES, MOCK_SLOTS, MOCK_USERS } from '@/lib/mockData';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateBranchId } from '@/lib/validators';
import { applySandboxHeaders, createSandboxForbiddenResponse, isSandboxEnabled } from '@/lib/apiMode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    if (!isSandboxEnabled()) {
      return createSandboxForbiddenResponse();
    }

    const { branchId: branchIdStr } = await params;
    const branchId = validateBranchId({ branchId: branchIdStr });

    const branch = MOCK_BRANCHES.find((b) => b.id === branchId);
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const clinic = MOCK_CLINICS.find((c) => c.id === branch.clinicId);
    if (!clinic) {
      throw new NotFoundError('Clinic not found');
    }

    const doctorsRaw = MOCK_DOCTORS.filter((doctor) => doctor.branchId === branchId);

    const doctors = doctorsRaw.map((doctor) => ({
      id: doctor.id,
      specialization: doctor.specialization,
      experience: doctor.yearsOfExperience || 0,
      bio: doctor.bio || 'طبيب متخصص',
      avatar: doctor.avatar || null,
      rating: doctor.rating,
      reviewCount: doctor.reviewCount,
      name: MOCK_USERS.find((u) => u.id === doctor.userId)?.name || 'دكتور',
      user: {
        name: MOCK_USERS.find((u) => u.id === doctor.userId)?.name || 'دكتور',
      },
      servicesOffered: (doctor.servicesOffered || [])
        .map((serviceId) => MOCK_SERVICES.find((s) => s.id === serviceId))
        .filter((service): service is NonNullable<typeof service> => Boolean(service))
        .map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          icon: service.icon || '🦷',
        })),
    }));

    const servicesFromDoctors = Array.from(
      new Map(
        doctors
          .flatMap((doctor) => doctor.servicesOffered)
          .map((service) => [service.id, service])
      ).values()
    );

    const clinicServices = MOCK_SERVICES.filter((service) => service.clinicId === clinic.id).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      icon: service.icon || '🦷',
    }));

    const services = servicesFromDoctors.length > 0 ? servicesFromDoctors : clinicServices;

    const branchRating =
      doctors.length > 0
        ? doctors.reduce((sum, doctor) => sum + (doctor.rating || 0), 0) / doctors.length
        : clinic.rating || 0;

    const branchReviewCount =
      doctors.length > 0
        ? doctors.reduce((sum, doctor) => sum + (doctor.reviewCount || 0), 0)
        : clinic.reviewCount || 0;

    const timeSlots = MOCK_SLOTS.filter((slot) => slot.branchId === branchId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((slot) => ({
        id: slot.id,
        date: slot.date,
        time: slot.time,
        available: slot.available,
      }));

    const result = {
      id: branch.id,
      clinicId: branch.clinicId,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      latitude: branch.latitude,
      longitude: branch.longitude,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        specialty: clinic.specialty,
      },
      doctors,
      services,
      rating: Number(branchRating.toFixed(1)),
      reviewCount: branchReviewCount,
      timeSlots,
    };

    return applySandboxHeaders(
      NextResponse.json({
        success: true,
        data: result,
        sandbox: true,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
