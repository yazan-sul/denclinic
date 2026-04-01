'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarHeader = ({ isCollapsed, onToggleCollapse }: SidebarHeaderProps) => {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between bg-card">
      {!isCollapsed && (
        <div>
          <h1 className="text-lg font-bold text-primary">عيادة</h1>
          <p className="text-xs text-muted-foreground">أسنان حديثة</p>
        </div>
      )}
      <button
        onClick={onToggleCollapse}
        className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
        title={isCollapsed ? 'توسيع' : 'طي'}
      >
        {isCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </button>
    </div>
  );
};

export default SidebarHeader;
