export default function Pagination({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const dari = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const sampai = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
      <span className="text-center sm:text-left">
        Menampilkan <b>{dari}–{sampai}</b> dari <b>{total}</b> data
      </span>
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 sm:text-sm">
          ← Sebelumnya
        </button>
        <span className="whitespace-nowrap text-xs sm:text-sm">Hal. <b>{page}</b> / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 sm:text-sm">
          Berikutnya →
        </button>
      </div>
    </div>
  );
}