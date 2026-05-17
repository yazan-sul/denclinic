'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ReactNode } from 'react';
import { usePushNotification } from '@/hooks/usePushNotification';

function PushNotificationSetup() {
  const { user } = useAuth();
  usePushNotification(user?.id);
  return null;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BookingProvider>
          <SidebarProvider>
            <PushNotificationSetup />
            {children}
          </SidebarProvider>
        </BookingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
