export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 pt-[8vh] backdrop-blur-sm sm:p-6 sm:pt-[10vh]"
      onClick={onClose}>
      {/* kartu: ramping + maksimal 78vh → scroll internal */}
      <div className="anim-pop flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()}>

        {/* header — selalu terlihat */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="truncate pr-2 text-[15px] font-bold text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="btn-press shrink-0 rounded-lg px-2 text-lg text-slate-400 transition hover:rotate-90 hover:text-slate-600"
            title="Tutup">✕</button>
        </div>

        {/* isi — scrollable, padding ramping */}
        <div className="overflow-y-auto px-4 py-3">
          <div className="anim-in">{children}</div>
        </div>
      </div>
    </div>
  );
}