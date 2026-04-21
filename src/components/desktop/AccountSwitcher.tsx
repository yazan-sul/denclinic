'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: string; route: string }> = {
  PATIENT:      { label: 'حساب المريض',  icon: '🏥', route: '/patient' },
  DOCTOR:       { label: 'حساب الطبيب',  icon: '👨‍⚕️', route: '/doctor' },
  STAFF:        { label: 'حساب الموظف',  icon: '👥', route: '/staff' },
  ADMIN:        { label: 'حساب المدير',  icon: '⚙️', route: '/admin' },
  CLINIC_OWNER: { label: 'مالك العيادة', icon: '🏢', route: '/manage' },
};

interface Props {
  isCollapsed: boolean;
}

export default function AccountSwitcher({ isCollapsed }: Props) {
  const { user, activeRole, switchRole } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user || user.roles.length <= 1 || !activeRole) return null;

  const handleSwitch = (role: UserRole) => {
    if (role === activeRole) return;
    switchRole(role);
    setOpen(false);
    router.push(ROLE_CONFIG[role].route);
  };

  return (
    <div dir="rtl">
      {/* Toggle button — same style as MenuItem */}
      <button
        onClick={() => setOpen((p) => !p)}
        title={isCollapsed ? 'تبديل الحساب' : undefined}
        className="w-full flex items-center px-4 py-3 transition-all duration-200 relative group cursor-pointer text-foreground hover:bg-secondary"
      >
        {/* Switch icon */}
        <span className="flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </span>

        {!isCollapsed && (
          <>
            <span className="mr-3 flex-1 text-right font-medium">تبديل الحساب</span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}

        {/* Tooltip when collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-3 py-1 bg-foreground text-background text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 font-medium">
            تبديل الحساب
          </div>
        )}
      </button>

      {/* Role list — only when expanded */}
      {open && !isCollapsed && (
        <div className="bg-secondary/30">
          {user.roles.map((role) => {
            const cfg = ROLE_CONFIG[role];
            const isActive = role === activeRole;
            return (
              <button
                key={role}
                onClick={() => handleSwitch(role)}
                disabled={isActive}
                className={`w-full flex items-center px-6 py-2.5 transition-all duration-150 text-sm ${
                  isActive
                    ? 'border-r-4 border-primary text-primary font-semibold cursor-default'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer'
                }`}
              >
                <span className="flex-shrink-0 text-base">{cfg.icon}</span>
                <span className="mr-3 flex-1 text-right">{cfg.label}</span>
                {isActive && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">الحالي</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
