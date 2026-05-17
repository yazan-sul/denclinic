'use client';

import { useEffect, useRef } from 'react';

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'web';
}

function onSwMessage(event: MessageEvent) {
  if (event.data?.type === 'PUSH_RECEIVED') {
    window.dispatchEvent(new Event('push-received'));
  }
}

export function usePushNotification(userId: number | null | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId || registered.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    if (!PUBLIC_VAPID_KEY) {
      console.warn('[PushNotification] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing');
      return;
    }

    registered.current = true;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY).buffer as ArrayBuffer,
          });
        }

        // listener مرة واحدة فقط — مُعرَّف خارج setup لتجنب التكرار
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
        navigator.serviceWorker.addEventListener('message', onSwMessage);

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            platform: getPlatform(),
          }),
        });
      } catch (err) {
        console.warn('[PushNotification] setup failed:', err);
        registered.current = false;
      }
    };

    setup();

    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, [userId]);
}
