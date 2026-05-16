import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from HTTP-only cookie
    const token = request.cookies.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }
    
    // Verify JWT signature and expiry
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ message: 'رمز غير صالح أو منتهي الصلاحية' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patient: true,
        doctorProfiles: { select: { id: true } },
        staffProfiles: {
        select: {
          branchId: true, clinicId: true, position: true,
          branch: { select: { name: true } },
          clinic: { select: { name: true } },
        },
      },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || '',
        email: user.email || null,
        phoneNumber: user.phoneNumber || '',
        roles: user.roles,
        ...(user.avatar && { avatar: user.avatar }),
        ...(user.doctorProfiles.length > 0 && { doctorProfileId: user.doctorProfiles[0].id }),
        ...(user.staffProfiles.length > 0 && { staffProfile: user.staffProfiles[0] }),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/auth/me — update name, email, phoneNumber
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ success: false, error: { message: 'غير مصرح' } }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: { message: 'رمز غير صالح' } }, { status: 401 });

    const { name, email, phoneNumber } = await request.json();

    if (!name?.trim()) throw new ValidationError('الاسم مطلوب');

    if (email?.trim()) {
      const dup = await prisma.user.findFirst({ where: { email: email.trim(), NOT: { id: decoded.userId } } });
      if (dup) throw new ValidationError('البريد الإلكتروني مستخدم من مستخدم آخر');
    }

    if (phoneNumber?.trim()) {
      const dup = await prisma.user.findFirst({ where: { phoneNumber: phoneNumber.trim(), NOT: { id: decoded.userId } } });
      if (dup) throw new ValidationError('رقم الهاتف مستخدم من مستخدم آخر');
    }

    const updated = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        name:        name.trim(),
        email:       email !== undefined       ? (email.trim() || null)       : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber.trim()            : undefined,
      },
      select: { name: true, email: true, phoneNumber: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
