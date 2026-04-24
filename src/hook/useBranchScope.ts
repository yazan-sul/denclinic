import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Returns the branch scope for the current user.
 * - ADMIN / CLINIC_OWNER → null (see all branches)
 * - BRANCH_MANAGER       → { branchId, branchName } (not yet implemented)
 */
export function useBranchScope(): { branchId: number; branchName: string } | null {
  // BRANCH_MANAGER is not yet a valid role in the system
  return null;
}

export function useIsFullAdmin(): boolean {
  const authContext = useContext(AuthContext);
  const roles = authContext?.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('CLINIC_OWNER');
}