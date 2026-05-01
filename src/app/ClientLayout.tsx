'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost' || true) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration);
          },
          (registrationError) => {
            console.log('SW registration failed: ', registrationError);
          }
        );
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const redirectIfOffline = () => {
      if (!navigator.onLine && pathname !== '/patient/records') {
        router.replace('/patient/records');
      }
    };

    redirectIfOffline();
    const handleOffline = () => redirectIfOffline();
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [pathname, router]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <BookingProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </BookingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
