/* eslint-disable @typescript-eslint/no-explicit-any */

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    url?: string;
    icon?: string;
  };

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // لو التطبيق مفتوح — أرسل message بدل إشعار النظام
      if (clients.length > 0) {
        clients.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED', data }));
        return;
      }
      // التطبيق مغلق — عرض إشعار النظام
      return sw.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon ?? '/icons/tooth-v2.png',
        badge: '/icons/tooth-v2.png',
        data: { url: data.url ?? '/' },
        dir: 'rtl',
        lang: 'ar',
      });
    })
  );
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url = (event.notification.data as { url: string }).url;

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients: readonly WindowClient[]) => {
        const existing = clients.find((c) => c.url.includes(url) && 'focus' in c);
        if (existing) return existing.focus();
        return sw.clients.openWindow(url);
      })
  );
});
