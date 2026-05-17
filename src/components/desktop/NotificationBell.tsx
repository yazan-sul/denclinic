'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { NotificationIcon, XIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  onBehalfOfName: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

const typeIcon: Record<string, string> = {
  CLINIC_ASSIGNMENT: '🏥',
  APPOINTMENT_REMINDER: '📅',
  APPOINTMENT_UPDATED: '🔄',
  GENERAL: '🔔',
};

export default function NotificationBell() {
  const authContext = useContext(AuthContext);
  const activeRole  = authContext?.activeRole ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadSnapshot, setUnreadSnapshot] = useState<Set<number>>(new Set());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const roleParam = activeRole ? `?activeRole=${activeRole}` : '';

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications${roleParam}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setNotifications(json.data);
    } catch {
      // silent
    }
  }, [roleParam]);

  useEffect(() => {
    fetchNotifications();

    // fallback polling كل 5 دقائق فقط
    const interval = setInterval(fetchNotifications, 300000);

    // refresh فوري لما المستخدم يرجع للتبويب
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    document.addEventListener('visibilitychange', onVisible);

    // refresh لما يوصل push وهو داخل التطبيق
    const onPush = () => fetchNotifications();
    window.addEventListener('push-received', onPush);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('push-received', onPush);
    };
  }, [fetchNotifications]);

  const handleOpen = async () => {
    setUnreadSnapshot(new Set(notifications.filter((n) => !n.isRead).map((n) => n.id)));
    setIsOpen(true);
    if (unreadCount > 0) {
      try {
        await fetch(`/api/notifications${roleParam}`, { method: 'PATCH', credentials: 'include' });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch {
        // silent
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUnreadSnapshot(new Set());
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (notif.link) {
      window.location.href = notif.link;
    }
    handleClose();
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg text-foreground hover:bg-secondary transition-colors border border-border cursor-pointer"
        title="الإشعارات"
      >
        <NotificationIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[60]"
          onClick={handleClose}
        />
      )}

      {/* Side Panel — slides in from the right */}
      <div
        dir="rtl"
        className={`fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-card border-r border-border shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotificationIcon className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-base">الإشعارات</h4>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <NotificationIcon className="w-12 h-12 opacity-20" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const wasUnread = unreadSnapshot.has(notif.id);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-right px-5 py-4 border-b border-border/50 hover:bg-secondary/50 transition-colors flex gap-3 ${
                    wasUnread ? 'bg-primary/10 border-r-2 border-r-primary' : ''
                  }`}
                >
                  <span className={`text-xl flex-shrink-0 mt-0.5 ${wasUnread ? '' : 'opacity-40'}`}>
                    {typeIcon[notif.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    {notif.onBehalfOfName && (
                      <span className="inline-block text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-1">
                        بخصوص: {notif.onBehalfOfName}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${wasUnread ? 'font-bold text-foreground' : 'font-normal text-muted-foreground'}`}>
                        {notif.title}
                      </p>
                      {wasUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed text-right ${wasUnread ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}