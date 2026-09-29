export default function SettingsShell({
  icon: Icon,
  title,
  description,
  badge = null,
  children,
  footer = null,
}) {
  return (
    <div className="mx-auto max-w-4xl">
      {/* HEADER */}
      <div className="anim-up mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/80 text-indigo-600 shadow-sm backdrop-blur-xl">
            {Icon && (
              <Icon size={22} />
            )}
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>

        {badge && (
          <div className="inline-flex self-start rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
            {badge}
          </div>
        )}
      </div>

      {/* GLASS PANEL */}
      <div className="anim-up overflow-hidden rounded-3xl border border-white/30 bg-white/80 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.38)] backdrop-blur-2xl">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />

        <div className="p-5 sm:p-7">
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}