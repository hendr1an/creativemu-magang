// ===== Placeholder shimmer saat loading =====
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-2.5 w-32" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-3 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-8 flex-1" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Angka yang menghitung naik (counter animasi) =====
import { useEffect, useState } from 'react';

export function CountUp({ value, suffix = '', duration = 900, className = '' }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (value == null || isNaN(Number(value))) return;
    const awal = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - awal) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(Number(value) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value == null || isNaN(Number(value))) return <span className={className}>—</span>;
  return <span className={className}>{n}{suffix}</span>;
}