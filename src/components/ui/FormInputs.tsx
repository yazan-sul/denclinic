import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, helper, className, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium">{label}</label>}
    <input
      {...props}
      className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
        error ? 'border-red-500' : 'border-border'
      } ${className}`}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
  </div>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, error, options, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium">{label}</label>}
    <select
      {...props}
      className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
        error ? 'border-red-500' : 'border-border'
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({ label, error, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium">{label}</label>}
    <textarea
      {...props}
      className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
        error ? 'border-red-500' : 'border-border'
      }`}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);
