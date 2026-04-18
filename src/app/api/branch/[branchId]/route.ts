import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateBranchId } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId: branchIdStr } = await params;
    const branchId = validateBranchId({ branchId: branchIdStr });

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        clinicId: true,
        name: true,
        address: true,
        phone: true,
        latitude: true,
        longitude: true,
        clinic: {
          select: {
            id: true,
            name: true,
            specialty: true,
            rating: true,
            reviewCount: true,
            services: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        doctors: {
          select: {
            id: true,
            specialization: true,
            yearsOfExperience: true,
            bio: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            user: {
              select: {
                name: true,
              },
            },
            servicesOffered: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        slots: {
          where: {
            slotDate: {
              gte: new Date(),
            },
          },
          orderBy: {
            slotDate: 'asc',
          },
          select: {
            id: true,
            slotDate: true,
            startTime: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const servicesFromDoctors = Array.from(
      new Map(
        branch.doctors
          .flatMap(doctor => doctor.servicesOffered)
          .map(service => [service.id, service])
      ).values()
    );

    const services =
      servicesFromDoctors.length > 0
        ? servicesFromDoctors
        : branch.clinic.services;

    const branchRating =
      branch.doctors.length > 0
        ? branch.doctors.reduce((sum, doctor) => sum + (doctor.rating || 0), 0) /
          branch.doctors.length
        : branch.clinic.rating || 0;

    const branchReviewCount =
      branch.doctors.length > 0
        ? branch.doctors.reduce((sum, doctor) => sum + (doctor.reviewCount || 0), 0)
        : branch.clinic.reviewCount || 0;

    const result = {
      id: branch.id,
      clinicId: branch.clinicId,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      latitude: branch.latitude,
      longitude: branch.longitude,
      clinic: {
        id: branch.clinic.id,
        name: branch.clinic.name,
        specialty: branch.clinic.specialty,
      },
      doctors: branch.doctors.map(doctor => ({
        id: doctor.id,
        specialization: doctor.specialization,
        experience: doctor.yearsOfExperience || 0,
        bio: doctor.bio || 'طبيب متخصص',
        avatar: doctor.avatar || null,
        rating: doctor.rating,
        reviewCount: doctor.reviewCount,
        name: doctor.user?.name || 'دكتور',
        user: {
          name: doctor.user?.name || 'دكتور',
        },
        servicesOffered: doctor.servicesOffered.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          icon: service.icon || '🦷',
        })),
      })),
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        icon: service.icon || '🦷',
      })),
      rating: Number(branchRating.toFixed(1)),
      reviewCount: branchReviewCount,
      timeSlots: branch.slots.map(slot => ({
        id: slot.id,
        date: slot.slotDate,
        time: slot.startTime,
        available: slot.isAvailable,
      })),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
