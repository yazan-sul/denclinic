type ManagedBranch = {
  id: number;
  name: string;
} | null;

type AuthSerializableUser = {
  id: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  avatar?: string | null;
  emailVerified?: boolean;
  googleId?: string | null;
  managedBranch?: ManagedBranch;
};

export function serializeAuthUser(user: AuthSerializableUser) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    role: user.role,
    emailVerified: user.emailVerified ?? false,
    ...(user.avatar && { avatar: user.avatar }),
    ...(user.googleId && { googleId: user.googleId }),
    ...(user.managedBranch && {
      branchId: user.managedBranch.id,
      branchName: user.managedBranch.name,
    }),
  };
}
