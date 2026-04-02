import React, { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

export default function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-muted-foreground px-1 py-2 mb-2">
        {title}
      </h3>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
