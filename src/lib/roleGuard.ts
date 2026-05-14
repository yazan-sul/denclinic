import { NextRequest } from 'next/server';
import { ForbiddenError } from '@/lib/errors';

/**
 * Extracts activeRole from query params or request body header.
 * Returns null if not provided.
 */
export function getActiveRole(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('activeRole') ?? request.headers.get('x-active-role');
}

/**
 * Throws ForbiddenError if the request is being made in STAFF mode.
 * Use this at the top of every /api/doctor/* endpoint.
 */
export function rejectIfStaffMode(request: NextRequest): void {
  const activeRole = getActiveRole(request);
  if (activeRole === 'STAFF') {
    throw new ForbiddenError('لا يمكن الوصول إلى بيانات الطبيب في وضع الستاف');
  }
}

/**
 * Throws ForbiddenError if the request is being made in DOCTOR mode.
 * Use this at the top of endpoints that are exclusively for STAFF.
 */
export function rejectIfDoctorMode(request: NextRequest): void {
  const activeRole = getActiveRole(request);
  if (activeRole === 'DOCTOR') {
    throw new ForbiddenError('لا يمكن الوصول إلى بيانات الستاف في وضع الطبيب');
  }
}
