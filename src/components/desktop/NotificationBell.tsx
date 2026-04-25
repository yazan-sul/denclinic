'use client';

import { useEffect, useState, useCallback } from 'react';
import { NotificationIcon, XIcon } from '@/components/Icons';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setUnreadCount(json.unreadCount);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (unreadCount > 0) {
      try {
        await fetch('/api/notifications', { method: 'PATCH', credentials: 'include' });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } catch {
        // silent
      }
    }
  };

  const handleClose = () => setIsOpen(false);

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
          className="fixed inset-0 bg-black/30 z-40"
          onClick={handleClose}
        />
      )}

      {/* Side Panel — slides in from the right */}
      <div
        dir="rtl"
        className={`fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-card border-r border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
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
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full text-right px-5 py-4 border-b border-border/50 hover:bg-secondary/50 transition-colors flex gap-3 ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {typeIcon[notif.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed text-right">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}