import {
  Check,
  MonitorCog,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from 'lucide-react';

import {
  useTheme,
} from '../../context/ThemeContext';

export default function Tampilan() {
  const {
    theme,
    source,
    isDark,
    toggleTheme,
    setTheme,
    followSystemTheme,
  } = useTheme();

  return (
    <div className="max-w-3xl">
      {/* HEADER */}

      <div className="anim-up">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <Palette
              size={21}
            />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Tampilan
            </h1>

            <p className="mt-0.5 text-sm text-slate-500">
              Atur tema Creativemu agar
              nyaman digunakan di kondisi
              pencahayaan apa pun.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN THEME CARD */}

      <section className="anim-up mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">
              <div
                className={`theme-icon-stage flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isDark
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                <span className="theme-icon-swap">
                  {isDark ? (
                    <Moon size={22} />
                  ) : (
                    <Sun size={22} />
                  )}
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-800">
                  {isDark
                    ? 'Mode Gelap'
                    : 'Mode Terang'}
                </p>

                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                  {isDark
                    ? 'Warna slate gelap modern dengan kontras tinggi tanpa menggunakan background hitam pekat.'
                    : 'Tampilan terang yang bersih untuk penggunaan di lingkungan dengan pencahayaan normal.'}
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  <Sparkles
                    size={11}
                  />

                  {source === 'system'
                    ? 'Mengikuti tema perangkat'
                    : 'Pilihan manual tersimpan'}
                </div>
              </div>
            </div>

            {/* TOGGLE */}

            <button
              type="button"
              role="switch"
              aria-checked={
                isDark
              }
              aria-label="Ganti mode terang atau gelap"
              onClick={(event) =>
                toggleTheme(
                  event
                )
              }
              className={`theme-toggle relative h-11 w-[76px] shrink-0 rounded-full border p-1 shadow-inner outline-none transition focus-visible:ring-4 focus-visible:ring-purple-300/30 ${
                isDark
                  ? 'border-indigo-400/30 bg-slate-800'
                  : 'border-slate-200 bg-slate-200'
              }`}
            >
              <span
                className={`theme-toggle-thumb flex h-8 w-8 items-center justify-center rounded-full shadow-md ${
                  isDark
                    ? 'translate-x-8 bg-indigo-500 text-white'
                    : 'translate-x-0 bg-white text-amber-500'
                }`}
              >
                {isDark ? (
                  <Moon
                    size={16}
                  />
                ) : (
                  <Sun
                    size={17}
                  />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* MODE CHOICE */}

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">

          {/* LIGHT */}

          <button
            type="button"
            onClick={(event) =>
              setTheme(
                'light',
                event,
                'user'
              )
            }
            className={`theme-choice card-hover rounded-2xl border p-4 text-left ${
              theme === 'light' &&
              source === 'user'
                ? 'border-purple-400 ring-2 ring-purple-400/15'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Sun
                  size={18}
                />
              </span>

              {theme === 'light' &&
                source ===
                  'user' && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                    <Check
                      size={14}
                    />
                  </span>
                )}
            </div>

            <p className="mt-3 text-sm font-bold text-slate-800">
              Terang
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Selalu gunakan tampilan
              terang.
            </p>
          </button>

          {/* DARK */}

          <button
            type="button"
            onClick={(event) =>
              setTheme(
                'dark',
                event,
                'user'
              )
            }
            className={`theme-choice card-hover rounded-2xl border p-4 text-left ${
              theme === 'dark' &&
              source === 'user'
                ? 'border-purple-400 ring-2 ring-purple-400/15'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
                <Moon
                  size={18}
                />
              </span>

              {theme === 'dark' &&
                source ===
                  'user' && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                    <Check
                      size={14}
                    />
                  </span>
                )}
            </div>

            <p className="mt-3 text-sm font-bold text-slate-800">
              Gelap
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Selalu gunakan tampilan
              gelap.
            </p>
          </button>

          {/* SYSTEM */}

          <button
            type="button"
            onClick={(event) =>
              followSystemTheme(
                event
              )
            }
            className={`theme-choice card-hover rounded-2xl border p-4 text-left ${
              source === 'system'
                ? 'border-purple-400 ring-2 ring-purple-400/15'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MonitorCog
                  size={18}
                />
              </span>

              {source ===
                'system' && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                  <Check
                    size={14}
                  />
                </span>
              )}
            </div>

            <p className="mt-3 text-sm font-bold text-slate-800">
              Sistem
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Ikuti perubahan tema
              perangkat secara real-time.
            </p>
          </button>
        </div>
      </section>

      {/* INFORMATION */}

      <div className="anim-up mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-xs font-bold text-indigo-700">
          ✨ Anti-flicker aktif
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-indigo-600">
          Tema diterapkan sebelum React
          dimuat sehingga refresh halaman
          pada mode gelap tidak sempat
          menampilkan kilatan layar putih.
        </p>
      </div>
    </div>
  );
}