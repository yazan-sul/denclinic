import React, { ReactNode } from 'react';

interface SettingCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function SettingCard({
  title,
  children,
  action,
}: SettingCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
