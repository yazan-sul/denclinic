type SettingsTab = 'profile' | 'privacy' | 'notifications' | 'appointments' | 'account';

interface TabNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'الملف الشخصي' },
  { id: 'notifications', label: 'الإشعارات' },
  { id: 'privacy', label: 'الخصوصية' },
  { id: 'appointments', label: 'المواعيد' },
  { id: 'account', label: 'الحساب' },
];

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="flex overflow-x-auto gap-2 pb-2 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-t-lg whitespace-nowrap font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
