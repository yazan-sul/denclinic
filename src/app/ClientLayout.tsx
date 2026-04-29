'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ReactNode, useEffect } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
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
