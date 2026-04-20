'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffMessagesPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/staff'); }, [router]);
  return null;
}
