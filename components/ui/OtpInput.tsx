"use client";
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

/** Six separate digit boxes with auto-advance, backspace navigation and full-code paste support. */
export default function OtpInput({ value, onChange, disabled, length = 6, invalid }: { value: string; onChange: (value: string) => void; disabled?: boolean; length?: number; invalid?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  function set(index: number, digit: string) {
    const next = digits.slice(); next[index] = digit;
    onChange(next.join('').slice(0, length));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  }
  function key(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) { refs.current[index - 1]?.focus(); set(index - 1, ''); event.preventDefault(); }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  }
  function paste(event: ClipboardEvent<HTMLInputElement>) {
    const code = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!code) return;
    event.preventDefault(); onChange(code); refs.current[Math.min(code.length, length - 1)]?.focus();
  }
  return <div className="flex gap-2 sm:gap-3" role="group" aria-label="One-time code">
    {digits.map((digit, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} value={digit} disabled={disabled}
      inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Digit ${i + 1}`} aria-invalid={invalid || undefined}
      onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1))} onKeyDown={(e) => key(e, i)} onPaste={paste} onFocus={(e) => e.target.select()}
      className={`size-12 min-w-0 flex-1 rounded-none border bg-surface-2 text-center font-mono text-xl focus:border-accent focus:outline-none sm:size-14 sm:flex-none ${invalid ? 'border-danger' : 'border-line-strong'}`} />)}
  </div>;
}
