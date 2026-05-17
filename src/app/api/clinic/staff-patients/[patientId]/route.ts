import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '@/lib/errors';
import { UserRole, GuardianRelationship, GuardianStatus } from '@prisma/client';
import { rejectIfDoctorMode } from '@/lib/roleGuard';
import { createNotification } from '@/lib/notifications';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const VALID_RELATIONSHIPS = Object.values(GuardianRelationship).filter(r => r !== 'SELF');

function ageFrom(dob: Date | null): number | null {
  if (!dob) return null;
  return (Date.now() - dob.getTime()) / YEAR_MS;
}

function validateRelationship(
  relationship: string,
  guardianDob: Date | null,
  dependentDob: Date | null,
) {
  const gAge = ageFrom(guardianDob);
  const dAge = ageFrom(dependentDob);

  if (gAge !== null && gAge < 18 && relationship === 'CHILD')
    throw new ValidationError('لا يمكن إضافة ابن لشخص دون 18 سنة');
  if (gAge !== null && gAge < 18 && relationship === 'SPOUSE')
    throw new ValidationError('لا يمكن إضافة زوج لشخص دون 18 سنة');
  if (dAge !== null && dAge < 35 && relationship === 'GRANDPARENT')
    throw new ValidationError('الجد أو الجدة يجب أن يكون عمره 35 سنة على الأقل');
  if (dAge !== null && dAge < 18 && relationship === 'PARENT')
    throw new ValidationError('الوالد يجب أن يكون عمره 18 سنة على الأقل');
  if (dAge !== null && dAge < 18 && relationship === 'SPOUSE')
    throw new ValidationError('الزوج أو الزوجة يجب أن يكون عمره 18 سنة على الأقل');

  if (gAge !== null && dAge !== null) {
    const depOlderByYrs = (guardianDob!.getTime() - dependentDob!.getTime()) / YEAR_MS;
    if (relationship === 'PARENT' && depOlderByYrs < 10)
      throw new ValidationError('الشخص المضاف يجب أن يكون أكبر بـ 10 سنوات على الأقل ليكون والداً');
    if (relationship === 'CHILD' && depOlderByYrs > -10)
      throw new ValidationError('الشخص المضاف يجب أن يكون أصغر بـ 10 سنوات على الأقل ليكون ابناً');
    if (relationship === 'GRANDPARENT' && depOlderByYrs < 28)
      throw new ValidationError('الجد يجب أن يكون أكبر بـ 28 سنة على الأقل');
  }
}

async function requireStaff(request: NextRequest) {
  rejectIfDoctorMode(request);
  const token = request.cookies.get('authToken')?.value;
  if (!token) throw new UnauthorizedError('غير مصرح');
  const decoded = verifyToken(token);
  if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');
  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { roles: true } });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];
  if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN'))
    throw new ForbiddenError('لا تملك صلاحية إدارة ملفات المرضى');
  return decoded;
}

// GET /api/clinic/staff-patients/[patientId]
// Full patient profile with family members
export async function GET(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    await requireStaff(request);
    const { patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
      select: {
        id: true, nationalId: true, dateOfBirth: true, gender: true, bloodType: true, allergies: true, medicalHistory: true,
        user: { select: { id: true, name: true, phoneNumber: true, email: true } },
        guardians: {
          select: {
            id: true, relationship: true, status: true,
            guardianUser: { select: { id: true, name: true, patient: { select: { nationalId: true } } } },
          },
        },
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          take: 5,
          select: {
            id: true, appointmentDate: true, appointmentTime: true, status: true,
            service: { select: { name: true } },
            doctor:  { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    if (!patient) throw new ValidationError('المريض غير موجود');

    // Also load who this patient is guardian of
    const asGuardian = await prisma.patientGuardian.findMany({
      where: { guardianUserId: patient.user.id },
      select: {
        id: true, relationship: true, status: true,
        dependentPatient: {
          select: {
            id: true, nationalId: true,
            user: { select: { id: true, name: true, phoneNumber: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { ...patient, asGuardian } });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/staff-patients/[patientId]
// Add a family member to this patient (staff bypasses approval but keeps validation rules)
export async function POST(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    await requireStaff(request);
    const { patientId } = await params;
    const body = await request.json();
    const { dependentNationalId, relationship, direction = 'guardian-of' } = body;
    // direction: 'guardian-of' = patient is guardian of dependent
    //            'dependent-of' = patient is dependent, dependentNationalId is the guardian

    if (!dependentNationalId?.trim()) throw new ValidationError('رقم هوية الشخص المراد إضافته مطلوب');
    if (!relationship || !VALID_RELATIONSHIPS.includes(relationship)) throw new ValidationError('الصلة غير صحيحة');

    const patient = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
      select: { id: true, dateOfBirth: true, user: { select: { id: true, name: true } } },
    });
    if (!patient) throw new ValidationError('المريض الأساسي غير موجود');

    const other = await prisma.patient.findFirst({
      where: { nationalId: dependentNationalId.trim() },
      select: { id: true, dateOfBirth: true, user: { select: { id: true, name: true } } },
    });
    if (!other) throw new ValidationError('لا يوجد مريض بهذا الرقم في النظام');
    if (other.id === patient.id) throw new ValidationError('لا يمكن إضافة الشخص لنفسه');

    let guardianUserId: number;
    let dependentPatientId: number;
    let guardianDob: Date | null;
    let dependentDob: Date | null;

    if (direction === 'guardian-of') {
      // patient IS the guardian, other IS the dependent
      guardianUserId   = patient.user.id;
      dependentPatientId = other.id;
      guardianDob      = patient.dateOfBirth;
      dependentDob     = other.dateOfBirth;
    } else {
      // other IS the guardian, patient IS the dependent
      guardianUserId   = other.user.id;
      dependentPatientId = patient.id;
      guardianDob      = other.dateOfBirth;
      dependentDob     = patient.dateOfBirth;
    }

    validateRelationship(relationship, guardianDob, dependentDob);

    const existing = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId, patientId: dependentPatientId } },
    });
    if (existing) throw new ConflictError('هذه العلاقة مسجّلة بالفعل');

    const link = await prisma.patientGuardian.create({
      data: {
        guardianUserId,
        patientId:        dependentPatientId,
        relationship:     relationship as GuardianRelationship,
        status:           GuardianStatus.APPROVED,
        dependentInitiated: false,
      },
      include: {
        dependentPatient: { select: { id: true, nationalId: true, user: { select: { id: true, name: true, phoneNumber: true } } } },
        guardianUser:     { select: { id: true, name: true } },
      },
    });

    const guardianName  = link.guardianUser.name;
    const dependentName = link.dependentPatient.user.name;
    const dependentUserId = link.dependentPatient.user.id ?? null;

    // إشعار ولي الأمر
    await createNotification({
      userId: guardianUserId, type: 'GENERAL',
      title: 'تمت إضافتك كولي أمر',
      message: `تمت إضافتك ولياً للأمر على ${dependentName} من قِبل العيادة.`,
      link: '/patient/family', targetRole: 'PATIENT',
    });

    // إشعار المريض التابع (إن كان له حساب)
    if (dependentUserId) {
      await createNotification({
        userId: dependentUserId, type: 'GENERAL',
        title: 'تمت إضافة ولي أمر لك',
        message: `تمت إضافة ${guardianName} ولياً للأمر عليك من قِبل العيادة.`,
        link: '/patient/family', targetRole: 'PATIENT',
      });
    }

    return NextResponse.json({ success: true, data: link }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clinic/staff-patients/[patientId]?linkId=X
// Remove a family link
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    await requireStaff(request);
    const { patientId } = await params;
    const linkId = new URL(request.url).searchParams.get('linkId');
    if (!linkId) throw new ValidationError('معرّف العلاقة مطلوب');

    const link = await prisma.patientGuardian.findFirst({
      where: {
        id: Number(linkId),
        OR: [{ patientId: Number(patientId) }, { guardianUser: { patient: { id: Number(patientId) } } }],
      },
      include: {
        guardianUser:    { select: { id: true, name: true } },
        dependentPatient: { select: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!link) throw new ValidationError('العلاقة غير موجودة');

    await prisma.patientGuardian.delete({ where: { id: link.id } });

    const guardianUserId   = link.guardianUser.id;
    const guardianName     = link.guardianUser.name;
    const dependentUserId  = link.dependentPatient.user.id;
    const dependentName    = link.dependentPatient.user.name;

    await createNotification({
      userId: guardianUserId, type: 'GENERAL',
      title: 'تمت إزالتك من ملف عائلي',
      message: `تمت إزالة صلاحية ولايتك على ${dependentName} من قِبل العيادة.`,
      link: '/patient/family', targetRole: 'PATIENT',
    });

    await createNotification({
      userId: dependentUserId, type: 'GENERAL',
      title: 'تمت إزالة ولي أمر',
      message: `تمت إزالة ${guardianName} من قائمة أولياء أمورك من قِبل العيادة.`,
      link: '/patient/family', targetRole: 'PATIENT',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
