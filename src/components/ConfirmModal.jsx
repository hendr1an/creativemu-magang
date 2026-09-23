// ===== Modal konfirmasi custom — menggantikan confirm() bawaan browser =====
export default function ConfirmModal({
  open, onClose, onConfirm, busy = false,
  judul, teks, teksConfirm = 'Ya, Lanjutkan', tipe = 'danger',
}) {
  if (!open) return null;

  const GAYA = {
    danger: { ikon: '⚠️', btn: 'bg-red-600 hover:bg-red-700', ring: 'ring-red-100' },
    warn:   { ikon: '⚠️', btn: 'bg-amber-500 hover:bg-amber-600', ring: 'ring-amber-100' },
    info:   { ikon: 'ℹ️', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'ring-indigo-100' },
  };
  const g = GAYA[tipe] ?? GAYA.danger;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}>
      <div className="anim-pop w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`anim-pop mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl ring-4 ${g.ring}`}
            style={{ animationDelay: '80ms' }}>
            {g.ikon}
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">{judul}</h3>
          {teks && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{teks}</p>
          )}
        </div>
        <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <button onClick={onClose} disabled={busy}
            className="btn-press flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={busy}
            className={`btn-press flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow disabled:opacity-50 ${g.btn}`}>
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Memproses…
              </span>
            ) : teksConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}