'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <AuthProvider>
        <ThemeProvider>
          <BookingProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </BookingProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
