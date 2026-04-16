'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
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
