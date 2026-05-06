'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminSettingsItems } from '@/config/adminSettingsItems';

interface AdminSettingsShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function AdminSettingsShell({
  title,
  description,
  children,
}: AdminSettingsShellProps) {
  const pathname = usePathname();

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" dir="rtl">
      <aside className="h-fit rounded-xl border border-border bg-card p-2 shadow-sm">
        <div className="px-3 py-3">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">Manage security and app preferences.</p>
        </div>

        <nav className="space-y-1">
          {adminSettingsItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block font-semibold">{item.label}</span>
                  <span className={`mt-0.5 block text-xs ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200">
        <div className="mb-6 border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}
