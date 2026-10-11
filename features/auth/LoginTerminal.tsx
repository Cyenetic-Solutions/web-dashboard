"use client";
import { useEffect, useState } from 'react';

const lines = ['> initialising secure session…', '> tls1.3 handshake ok', '> zero-trust policy: admin.cyenetic.com', '> factor 1: password · factor 2: email one-time code', '> audit trail: append-only', '> awaiting operator credentials_'];

/** Typing terminal; renders all lines immediately when reduced motion is preferred. */
export default function LoginTerminal() {
  const [count, setCount] = useState(0);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = window.setTimeout(() => setCount(lines.length), 0); return () => window.clearTimeout(t); }
    const timer = window.setInterval(() => setChars((c) => {
      const current = lines[count];
      if (!current) { window.clearInterval(timer); return c; }
      if (c >= current.length) { setCount((n) => n + 1); return 0; }
      return c + 1;
    }), 28);
    return () => window.clearInterval(timer);
  }, [count]);
  return <div aria-hidden="true" className="border border-white/15 bg-white/[.03] p-6 font-mono text-sm leading-7 text-white/80">
    <div className="mb-4 flex gap-2"><span className="size-2.5 bg-white/20" /><span className="size-2.5 bg-white/20" /><span className="size-2.5 bg-cye-orange" /></div>
    {lines.slice(0, count).map((line) => <p key={line} className={line.includes('ok') ? 'text-cye-orange' : ''}>{line}</p>)}
    {count < lines.length && <p>{lines[count].slice(0, chars)}<span className="cye-caret">▮</span></p>}
  </div>;
}
