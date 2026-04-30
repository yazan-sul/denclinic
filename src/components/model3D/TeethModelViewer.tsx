'use client';

import React from 'react';

interface TeethModelViewerProps {
  modelPath: string;
}

export default function TeethModelViewer({ modelPath }: TeethModelViewerProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
      <div className="text-center p-8">
        <p className="text-muted-foreground mb-4">
          مكون عرض النموذج ثلاثي الأبعاد سيتم إضافته هنا.
        </p>
        <p className="text-xs text-muted-foreground">
          مسار النموذج: {modelPath}
        </p>
        <div className="mt-4 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium">بانتظار الكود القديم الخاص بك...</p>
        </div>
      </div>
    </div>
  );
}
