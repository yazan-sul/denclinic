'use client';

const settings = [
  { label: 'Notifications', description: 'Send dashboard notifications for important events.', defaultChecked: true },
  { label: 'Email', description: 'Allow transactional email messages from the system.', defaultChecked: true },
  { label: 'SMS', description: 'Allow SMS reminders and verification messages.', defaultChecked: false },
];

export default function AdminAppSettingsPanel() {
  return (
    <div className="space-y-1">
      {settings.map(({ label, description, defaultChecked }) => (
        <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} />
            <span className="h-6 w-11 rounded-full bg-secondary transition peer-checked:bg-primary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
          </label>
        </div>
      ))}
    </div>
  );
}
