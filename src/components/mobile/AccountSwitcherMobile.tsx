'use client';

import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: string; route: string }> = {
  PATIENT:      { label: 'حساب المريض',  icon: '🏥', route: '/patient' },
  DOCTOR:       { label: 'حساب الطبيب',  icon: '👨‍⚕️', route: '/doctor' },
  STAFF:        { label: 'حساب الموظف',  icon: '👥', route: '/staff' },
  ADMIN:        { label: 'حساب المدير',  icon: '⚙️', route: '/admin' },
  CLINIC_OWNER: { label: 'مدير العيادة', icon: '🏢', route: '/admin' },
};

export default function AccountSwitcherMobile() {
  const { user, activeRole, switchRole } = useAuth();
  const router = useRouter();

  if (!user || user.roles.length <= 1 || !activeRole) return null;

  const handleSwitch = (role: UserRole) => {
    if (role === activeRole) return;
    switchRole(role);
    router.push(ROLE_CONFIG[role].route);
  };

  return (
    <div className="mb-6" dir="rtl">
      <h3 className="text-sm font-bold text-muted-foreground px-1 py-2 mb-2">
        تبديل الحساب
      </h3>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {user.roles.map((role, i) => {
          const cfg = ROLE_CONFIG[role];
          const isActive = role === activeRole;
          return (
            <button
              key={role}
              onClick={() => handleSwitch(role)}
              disabled={isActive}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${
                i > 0 ? 'border-t border-border' : ''
              } ${
                isActive
                  ? 'bg-primary/5 cursor-default'
                  : 'hover:bg-secondary cursor-pointer'
              }`}
            >
              <span className="text-xl">{cfg.icon}</span>
              <span className={`flex-1 text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {cfg.label}
              </span>
              {isActive ? (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  الحالي
                </span>
              ) : (
                <svg className="w-4 h-4 text-muted-foreground rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
