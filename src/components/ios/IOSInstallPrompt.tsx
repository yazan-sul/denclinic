'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ios-install-prompt-dismissed';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isInstalled()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 left-3 right-3 z-[100] bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3 md:hidden"
    >
      <span className="text-2xl flex-shrink-0">📱</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          فعّل الإشعارات على iPhone
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          اضغط{' '}
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
            <ShareIcon /> مشاركة
          </span>
          {' '}ثم{' '}
          <span className="font-medium text-foreground">"Add to Home Screen"</span>
          {' '}لاستقبال الإشعارات
        </p>
      </div>

      <button
        onClick={dismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
        aria-label="إغلاق"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 inline"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
