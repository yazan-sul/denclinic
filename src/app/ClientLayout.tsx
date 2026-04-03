'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BookingProvider>{children}</BookingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
