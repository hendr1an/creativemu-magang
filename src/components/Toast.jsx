import { useEffect } from 'react';

const GAYA = {
  ok:    { ikon: '✅', cls: 'border-green-200 bg-green-50 text-green-700' },
  err:   { ikon: '❌', cls: 'border-red-200 bg-red-50 text-red-600' },
  info:  { ikon: 'ℹ️', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  warn:  { ikon: '⚠️', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
};

export default function Toast({ toast, onTutup }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onTutup(), toast.durasi ?? 4000);
    return () => clearTimeout(t);
  }, [toast, onTutup]);

  if (!toast) return null;
  const g = GAYA[toast.tipe ?? 'info'] ?? GAYA.info;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className={`anim-down pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${g.cls}`}
        role="alert">
        <span className="text-lg leading-none">{g.ikon}</span>
        <p className="text-sm font-medium leading-relaxed">{toast.teks}</p>
        <button onClick={() => onTutup()}
          className="ml-1 shrink-0 text-slate-400 transition hover:text-slate-600">✕</button>
      </div>
    </div>
  );
}