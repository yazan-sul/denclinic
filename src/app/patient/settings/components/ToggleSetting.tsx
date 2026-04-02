interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-border last:border-b-0">
      <div className="flex-1">
        <h4 className="font-semibold">{label}</h4>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-5 h-5 cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}
