import React, { ReactNode } from 'react';

interface SettingRowProps {
  icon: ReactNode;
  label: string;
  description?: string;
  trailing?: ReactNode; // For toggles or custom trailing elements
  onClick?: () => void;
  showChevron?: boolean;
}

export default function SettingRow({
  icon,
  label,
  description,
  trailing,
  onClick,
  showChevron = true,
}: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-0 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 hover:cursor-pointer transition-colors text-right"
    >
      {/* Icon - Right side for RTL */}
      <div className="text-muted-foreground w-6 h-6 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>

      {/* Label & Description */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>

      {/* Trailing Element */}
      {trailing ? <div className="flex-shrink-0">{trailing}</div> : null}
    </button>
  );
}
