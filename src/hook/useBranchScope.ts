import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Returns the branch scope for the current user.
 * - ADMIN / CLINIC_OWNER → null (see all branches)
 * - BRANCH_MANAGER       → { branchId, branchName } (see only their branch)
 */
export function useBranchScope(): { branchId: number; branchName: string } | null {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // 🧪 TEST MODE — uncomment one line to simulate:
  // return null; // simulate ADMIN (sees everything)
  // return { branchId: 1, branchName: 'الفرع الرئيسي - رام الله' }; // simulate BRANCH_MANAGER

  if (!user) return null;
  if (user.role === 'BRANCH_MANAGER' && user.branchId && user.branchName) {
    return { branchId: user.branchId, branchName: user.branchName };
  }
  return null;
}

export function useIsFullAdmin(): boolean {
  const authContext = useContext(AuthContext);
  const role = authContext?.user?.role;
  return role === 'ADMIN' || role === 'CLINIC_OWNER';
}
