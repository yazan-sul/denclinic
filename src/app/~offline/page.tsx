'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, Home, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <WifiOff className="w-12 h-12 text-primary" />
      </div>
      
      <h1 className="text-3xl font-bold text-foreground mb-4">
        أنت غير متصل بالإنترنت
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-8 text-lg">
        عذراً، هذه الصفحة غير متوفرة حالياً في وضع عدم الاتصال. يمكنك العودة إلى لوحة التحكم للوصول إلى السجلات المحفوظة مسبقاً.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <Link 
          href="/patient" 
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
        >
          <Home className="w-5 h-5" />
          الرئيسية
        </Link>
        
        <button 
          onClick={() => window.location.reload()}
          className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-border"
        >
          <RefreshCw className="w-5 h-5" />
          تحديث
        </button>
      </div>

      <div className="mt-12 p-4 bg-muted rounded-lg border border-border text-sm text-muted-foreground flex items-start gap-3 text-right">
        <div className="bg-primary/20 p-1 rounded-full mt-1">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
        <p>
          تلميح: يمكنك عرض السجلات الطبية التي قمت بحفظها مسبقاً حتى وأنت غير متصل بالإنترنت.
        </p>
      </div>
    </div>
  );
}
