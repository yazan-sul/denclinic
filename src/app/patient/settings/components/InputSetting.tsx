interface InputSettingProps {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function InputSetting({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
}: InputSettingProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2 text-right">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right disabled:opacity-50"
      />
    </div>
  );
}
