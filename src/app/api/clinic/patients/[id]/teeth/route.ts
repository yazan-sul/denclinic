import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

const TOOTH_NUMBERS = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

const TOOTH_STATUSES = ["HEALTHY", "DECAYED", "FILLED", "CROWN", "MISSING"] as const;
const TOOTH_SURFACES = ["MESIAL", "DISTAL", "OCCLUSAL", "BUCCAL", "LINGUAL"] as const;

type ToothStatus = typeof TOOTH_STATUSES[number];

type ToothSurface = typeof TOOTH_SURFACES[number];

async function resolveAccess(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: { select: { clinicId: true, id: true } },
      staffProfile: { select: { clinicId: true } },
      clinicsOwned: { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError("غير مصرح");
  const roles = user.roles as UserRole[];

  if (roles.includes("DOCTOR") && user.doctorProfile?.clinicId)
    return { clinicId: user.doctorProfile.clinicId, doctorId: user.doctorProfile.id };
  if (roles.includes("STAFF") && user.staffProfile?.clinicId)
    return { clinicId: user.staffProfile.clinicId, doctorId: null };
  if (roles.includes("CLINIC_OWNER") && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, doctorId: null };
  throw new ForbiddenError("لا تملك صلاحية");
}

async function assertPatientAccess(patientId: number, clinicId: number) {
  const accessCheck = await prisma.appointment.findFirst({
    where: { patientId, clinicId },
    select: { id: true },
  });
  if (!accessCheck) throw new ForbiddenError("لا تملك صلاحية الوصول لهذا المريض");
}

async function ensureTeeth(patientId: number) {
  await prisma.tooth.createMany({
    data: TOOTH_NUMBERS.map((toothNumber) => ({ patientId, toothNumber })),
    skipDuplicates: true,
  });
}

// GET /api/clinic/patients/[id]/teeth
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("authToken")?.value;
    if (!token) throw new UnauthorizedError("غير مصرح");
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError("رمز غير صالح");

    const { clinicId } = await resolveAccess(decoded.userId);
    const { id } = await params;
    const patientId = parseInt(id, 10);
    if (isNaN(patientId)) throw new NotFoundError("مريض غير موجود");

    await assertPatientAccess(patientId, clinicId);
    await ensureTeeth(patientId);

    const url = new URL(request.url);
    const toothNumberParam = url.searchParams.get("toothNumber");

    if (toothNumberParam) {
      const toothNumber = parseInt(toothNumberParam, 10);
      if (!TOOTH_NUMBERS.includes(toothNumber)) throw new NotFoundError("سن غير موجود");

      const tooth = await prisma.tooth.findUnique({
        where: { patientId_toothNumber: { patientId, toothNumber } },
        include: {
          records: {
            orderBy: { createdAt: "desc" },
            include: { doctor: { include: { user: { select: { name: true } } } } },
          },
        },
      });

      if (!tooth) throw new NotFoundError("سن غير موجود");

      return NextResponse.json({
        success: true,
        data: {
          toothId: tooth.id,
          latest: tooth.records[0] ?? null,
          history: tooth.records,
        },
      });
    }

    const teeth = await prisma.tooth.findMany({
      where: { patientId },
      include: {
        records: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const latestByTooth = teeth.map((tooth) => ({
      toothNumber: tooth.toothNumber,
      latest: tooth.records[0] ?? null,
    }));

    return NextResponse.json({ success: true, data: latestByTooth });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/patients/[id]/teeth
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("authToken")?.value;
    if (!token) throw new UnauthorizedError("غير مصرح");
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError("رمز غير صالح");

    const { clinicId, doctorId } = await resolveAccess(decoded.userId);
    const { id } = await params;
    const patientId = parseInt(id, 10);
    if (isNaN(patientId)) throw new NotFoundError("مريض غير موجود");

    await assertPatientAccess(patientId, clinicId);
    await ensureTeeth(patientId);

    const body = await request.json();
    const toothNumber = parseInt(body?.toothNumber, 10);
    const status = body?.status as ToothStatus | undefined;
    const surfaces = (body?.surfaces ?? []) as ToothSurface[];
    const notes = typeof body?.notes === "string" ? body.notes : null;
    const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId : null;

    if (!TOOTH_NUMBERS.includes(toothNumber)) throw new NotFoundError("سن غير موجود");
    if (!status || !TOOTH_STATUSES.includes(status)) throw new NotFoundError("حالة غير صالحة");
    if (!Array.isArray(surfaces) || surfaces.some((s) => !TOOTH_SURFACES.includes(s))) {
      throw new NotFoundError("أسطح غير صالحة");
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId, clinicId },
        select: { id: true },
      });
      if (!appointment) throw new NotFoundError("موعد غير موجود");
    }

    const tooth = await prisma.tooth.findUnique({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      select: { id: true },
    });

    if (!tooth) throw new NotFoundError("سن غير موجود");

    const record = await prisma.toothRecord.create({
      data: {
        toothId: tooth.id,
        appointmentId,
        doctorId,
        status,
        surfaces,
        notes,
      },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return handleApiError(error);
  }
}
