import {
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  ChevronRight,
  Search,
  UserMinus,
} from 'lucide-react';


function angka(value) {
  const n = Number(value ?? 0);

  return Number.isFinite(n)
    ? n
    : 0;
}


function persen(value) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) {
    return '0%';
  }

  return `${Number(
    n.toFixed(2)
  )}%`;
}


function tanggalPendek(iso) {
  if (!iso) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }
  ).format(
    new Date(iso)
  );
}


function MetricChip({
  label,
  value,
  tone = 'slate',
  onClick,
}) {
  const tones = {
    indigo:
      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',

    green:
      'bg-green-50 text-green-700 hover:bg-green-100',

    amber:
      'bg-amber-50 text-amber-700 hover:bg-amber-100',

    red:
      'bg-red-50 text-red-600 hover:bg-red-100',

    slate:
      'bg-slate-50 text-slate-600 hover:bg-slate-100',
  };


  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-left transition active:scale-[0.98] ${
        tones[tone] ??
        tones.slate
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-0.5 text-base font-extrabold tabular-nums">
        {angka(value)}
      </p>
    </button>
  );
}


export default function YearlySuspensionAnalytics({
  yearly = [],
  suspensions = [],
  onOpenYear,
  onOpenYearMetric,
  onOpenSuspension,
}) {
  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    sortSuspension,
    setSortSuspension,
  ] =
    useState(
      'terbanyak'
    );


  const maxSuspension =
    useMemo(
      () =>
        Math.max(
          ...suspensions.map(
            (item) =>
              angka(
                item.jumlah
              )
          ),
          1
        ),
      [
        suspensions,
      ]
    );


  const filteredSuspensions =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();


        const rows =
          suspensions.filter(
            (item) =>
              !keyword ||
              String(
                item.alasan ??
                ''
              )
                .toLowerCase()
                .includes(
                  keyword
                )
          );


        rows.sort(
          (
            a,
            b
          ) => {
            if (
              sortSuspension ===
              'terbaru'
            ) {
              return String(
                b.terakhir ??
                ''
              ).localeCompare(
                String(
                  a.terakhir ??
                  ''
                )
              );
            }


            if (
              sortSuspension ===
              'az'
            ) {
              return String(
                a.alasan ??
                ''
              ).localeCompare(
                String(
                  b.alasan ??
                  ''
                ),
                'id-ID'
              );
            }


            return (
              angka(
                b.jumlah
              ) -
              angka(
                a.jumlah
              )
            );
          }
        );


        return rows;
      },
      [
        suspensions,
        search,
        sortSuspension,
      ]
    );


  return (
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">

      {/* =================================================
          REKAP TAHUNAN
      ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarDays
                size={18}
              />
            </span>

            <div>
              <h2 className="font-extrabold text-slate-800">
                Rekap Tahunan
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Klik tahun atau
                metrik untuk membuka
                data penyusunnya.
              </p>
            </div>
          </div>
        </div>


        {yearly.length ===
        0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">
              📭
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Belum ada data tahunan
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:p-5">
            {[...yearly]
              .sort(
                (
                  a,
                  b
                ) =>
                  Number(
                    b.tahun
                  ) -
                  Number(
                    a.tahun
                  )
              )
              .map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.tahun
                    }
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-indigo-100 hover:bg-indigo-50/30"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onOpenYear?.(
                          item
                        )
                      }
                      className="group flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <p className="text-xl font-extrabold text-slate-800 transition group-hover:text-indigo-700">
                          {
                            item.tahun
                          }
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                          {angka(
                            item.total_pendaftar
                          )}{' '}
                          total pendaftar
                        </p>
                      </div>


                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm ring-1 ring-slate-100 transition group-hover:translate-x-0.5">
                        <ChevronRight
                          size={14}
                        />
                      </span>
                    </button>


                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MetricChip
                        label="Pendaftar"
                        value={
                          item.total_pendaftar
                        }
                        tone="indigo"
                        onClick={() =>
                          onOpenYearMetric?.(
                            item,
                            'pendaftar'
                          )
                        }
                      />

                      <MetricChip
                        label="Diterima"
                        value={
                          item.diterima
                        }
                        tone="green"
                        onClick={() =>
                          onOpenYearMetric?.(
                            item,
                            'diterima'
                          )
                        }
                      />

                      <MetricChip
                        label="Pending"
                        value={
                          item.pending
                        }
                        tone="amber"
                        onClick={() =>
                          onOpenYearMetric?.(
                            item,
                            'pending'
                          )
                        }
                      />

                      <MetricChip
                        label="Ditolak"
                        value={
                          item.ditolak
                        }
                        tone="red"
                        onClick={() =>
                          onOpenYearMetric?.(
                            item,
                            'ditolak'
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </section>


      {/* =================================================
          ALASAN PENONAKTIFAN
      ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <UserMinus
                size={18}
              />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-slate-800">
                Alasan Penonaktifan
              </h2>

              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Klik alasan untuk
                membuka riwayat
                penonaktifan di
                Statistik Explorer.
              </p>
            </div>
          </div>


          {suspensions.length >
            0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    e
                  ) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Cari alasan penonaktifan..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-600 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>


              <select
                value={
                  sortSuspension
                }
                onChange={(
                  e
                ) =>
                  setSortSuspension(
                    e.target.value
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
              >
                <option value="terbanyak">
                  Terbanyak
                </option>

                <option value="terbaru">
                  Terbaru
                </option>

                <option value="az">
                  Alasan A–Z
                </option>
              </select>
            </div>
          )}
        </div>


        {suspensions.length ===
        0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">
              ✨
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Belum ada riwayat
              penonaktifan
            </p>
          </div>
        ) : filteredSuspensions.length ===
          0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">
              🔎
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Alasan tidak ditemukan
            </p>
          </div>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto p-4 sm:p-5">
            {filteredSuspensions.map(
              (
                item,
                index
              ) => {
                const jumlah =
                  angka(
                    item.jumlah
                  );


                const width =
                  Math.max(
                    (
                      jumlah /
                      maxSuspension
                    ) *
                      100,
                    3
                  );


                return (
                  <button
                    key={`${item.alasan}-${index}`}
                    type="button"
                    onClick={() =>
                      onOpenSuspension?.(
                        item
                      )
                    }
                    className="group w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/50 hover:shadow-sm active:translate-y-0 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-relaxed text-slate-700 transition group-hover:text-red-700">
                          {
                            item.alasan
                          }
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400 transition group-hover:text-red-500">
                          Buka detail
                          riwayat

                          <ChevronRight
                            size={12}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </p>
                      </div>


                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-600">
                        {
                          jumlah
                        }
                      </span>
                    </div>


                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all duration-300 group-hover:bg-red-500"
                        style={{
                          width:
                            `${width}%`,
                        }}
                      />
                    </div>


                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>
                        {persen(
                          item.persentase
                        )}{' '}
                        dari seluruh
                        penonaktifan
                      </span>

                      <span>
                        terakhir{' '}

                        {tanggalPendek(
                          item.terakhir
                        )}
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}