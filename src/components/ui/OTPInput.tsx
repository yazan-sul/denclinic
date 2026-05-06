'use client';

import { ClipboardEvent, KeyboardEvent, useMemo, useRef } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export default function OTPInput({
  value,
  onChange,
  length = 6,
  disabled,
  error,
  autoFocus = true,
}: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => value.replace(/\D/g, '').slice(0, length).split(''), [value, length]);

  const updateDigit = (index: number, nextValue: string) => {
    const nextDigits = [...Array(length)].map((_, i) => digits[i] || '');
    nextDigits[index] = nextValue.replace(/\D/g, '').slice(-1);
    onChange(nextDigits.join('').slice(0, length));

    if (nextValue && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div dir="ltr" className="flex justify-center gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ''}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`رقم ${index + 1} من رمز التحقق`}
          className={`h-12 w-10 rounded-lg border bg-background text-center text-lg font-semibold text-foreground transition focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-12 ${
            error ? 'border-destructive' : 'border-border'
          }`}
        />
      ))}
    </div>
  );
}
