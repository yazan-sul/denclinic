'use client';

interface SidebarFooterProps {
  isCollapsed: boolean;
}

const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  if (isCollapsed) return null;

  return (
    <div className="border-t border-border p-4 bg-card">
      <div className="text-sm text-foreground">
        <p className="font-semibold">عيادة الأسنان الحديثة</p>
        <p className="text-xs text-muted-foreground mt-1">النسخة 1.0.0</p>
        <button className="text-xs text-primary hover:text-primary-light mt-3 font-medium transition cursor-pointer">
          → المزيد من المعلومات
        </button>
      </div>
    </div>
  );
};

export default SidebarFooter;
