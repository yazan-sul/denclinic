'use client';

import React from 'react';

interface FormFieldProps {
  id?: string;
  label: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  id,
  label,
  error,
  helper,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
