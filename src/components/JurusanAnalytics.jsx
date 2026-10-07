import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Award,
  ChevronRight,
  GraduationCap,
  Search,
  Star,
  Users,
} from 'lucide-react';

import ScrollReveal from './ScrollReveal';


const DIVISION_META = [
  {
    key: 'div_admin',
    label: 'Admin',
    short: 'A',
    icon: '📋',
  },

  {
    key: 'div_sosmed',
    label: 'Sosmed',
    short: 'S',
    icon: '📱',
  },

  {
    key: 'div_marketplace',
    label: 'Marketplace',
    short: 'M',
    icon: '🛒',
  },

  {
    key: 'div_webdev',
    label: 'Web Developer',
    short: 'W',
    icon: '💻',
  },
];


function angka(
  value
) {
  const n =
    Number(
      value ??
      0
    );

  return Number.isFinite(
    n
  )
    ? n
    : 0;
}


function nilai(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }


  const n =
    Number(
      value
    );


  return Number.isFinite(
    n
  )
    ? n.toFixed(
        2
      )
    : '—';
}


function persen(
  value
) {
  const n =
    Number(
      value ??
      0
    );


  return Number.isFinite(
    n
  )
    ? `${Number(
        n.toFixed(
          2
        )
      )}%`
    : '0%';
}


/* =========================================================
   FAST COUNT-UP
========================================================= */

function AnimatedNumber({
  value,

  duration = 400,

  decimals = 0,
}) {
  const numberValue =
    Number(
      value ??
      0
    );


  const [
    display,
    setDisplay,
  ] =
    useState(
      0
    );


  const frameRef =
    useRef(
      null
    );


  useEffect(
    () => {
      if (
        !Number.isFinite(
          numberValue
        )
      ) {
        return undefined;
      }


      const reducedMotion =
        window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        )?.matches;


      if (
        reducedMotion
      ) {
        setDisplay(
          numberValue
        );

        return undefined;
      }


      const start =
        performance.now();


      const animate = (
        now
      ) => {
        const progress =
          Math.min(
            (
              now -
              start
            ) /
              duration,
            1
          );


        /*
          easeOutQuart
          lebih cepat terasa di awal,
          lalu halus di ujung.
        */
        const eased =
          1 -
          Math.pow(
            1 -
              progress,
            4
          );


        setDisplay(
          numberValue *
            eased
        );


        if (
          progress <
          1
        ) {
          frameRef.current =
            requestAnimationFrame(
              animate
            );
        }
      };


      frameRef.current =
        requestAnimationFrame(
          animate
        );


      return () => {
        if (
          frameRef.current
        ) {
          cancelAnimationFrame(
            frameRef.current
          );
        }
      };
    },
    [
      numberValue,
      duration,
    ]
  );


  return Number(
    display
  ).toFixed(
    decimals
  );
}


/* =========================================================
   FAST PROGRESS BAR
========================================================= */

function AnimatedProgressBar({
  width,

  delay = 0,
}) {
  const ref =
    useRef(
      null
    );


  const [
    active,
    setActive,
  ] =
    useState(
      false
    );


  useEffect(
    () => {
      const element =
        ref.current;


      if (!element) {
        return undefined;
      }


      const reduced =
        window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        )?.matches;


      if (
        reduced
      ) {
        setActive(
          true
        );

        return undefined;
      }


      const observer =
        new IntersectionObserver(
          (
            entries
          ) => {
            if (
              entries[
                0
              ]?.isIntersecting
            ) {
              setActive(
                true
              );

              observer.disconnect();
            }
          },
          {
            threshold: 0.1,
          }
        );


      observer.observe(
        element
      );


      return () => {
        observer.disconnect();
      };
    },
    []
  );


  return (
    <div
      ref={
        ref
      }
      className="h-2 overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className="h-full rounded-full bg-purple-500 transition-[width] duration-[550ms] ease-out"
        style={{
          width:
            active
              ? `${width}%`
              : '0%',

          transitionDelay:
            `${delay}ms`,
        }}
      />
    </div>
  );
}


/* =========================================================
   INSIGHT CARD
========================================================= */

function InsightCard({
  label,
  value,
  detail,
  Icon,
  tone = 'indigo',
  onClick,
}) {
  const tones = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      icon: 'text-indigo-600',
      hover:
        'hover:border-indigo-200 hover:bg-indigo-50/40',
    },

    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      icon: 'text-green-600',
      hover:
        'hover:border-green-200 hover:bg-green-50/40',
    },

    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      hover:
        'hover:border-amber-200 hover:bg-amber-50/40',
    },

    slate: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      icon: 'text-slate-600',
      hover:
        'hover:border-slate-300 hover:bg-slate-50',
    },
  };


  const config =
    tones[
      tone
    ] ??
    tones.indigo;


  const interactive =
    typeof onClick ===
    'function';


  const Component =
    interactive
      ? 'button'
      : 'div';


  return (
    <Component
      type={
        interactive
          ? 'button'
          : undefined
      }
      onClick={
        onClick
      }
      className={`group rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all duration-200 ${
        interactive
          ? `${config.hover} hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {
              label
            }
          </p>

          <p
            className={`mt-2 truncate text-xl font-extrabold ${config.text}`}
          >
            {
              value
            }
          </p>

          {detail && (
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              {
                detail
              }
            </p>
          )}
        </div>


        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${config.bg}`}
        >
          <Icon
            size={18}
            className={
              config.icon
            }
          />
        </span>
      </div>


      {interactive && (
        <p className="mt-3 flex items-center gap-1 text-[9px] font-bold text-indigo-500">
          Lihat detail

          <ChevronRight
            size={11}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </p>
      )}
    </Component>
  );
}


/* =========================================================
   METRIC
========================================================= */

function MetricButton({
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
      onClick={
        onClick
      }
      className={`rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-px active:scale-[0.98] ${
        tones[
          tone
        ] ??
        tones.slate
      }`}
    >
      <p className="text-[8px] font-bold uppercase tracking-wide opacity-70">
        {
          label
        }
      </p>

      <p className="mt-0.5 text-base font-extrabold tabular-nums">
        <AnimatedNumber
          value={
            angka(
              value
            )
          }
          duration={350}
        />
      </p>
    </button>
  );
}


/* =========================================================
   MAIN
========================================================= */

export default function JurusanAnalytics({
  data = [],

  summary = {},

  loading = false,

  error = null,

  onOpenJurusan,

  onOpenMetric,
}) {
  const [
    search,
    setSearch,
  ] =
    useState(
      ''
    );


  const [
    sort,
    setSort,
  ] =
    useState(
      'peserta'
    );


  const [
    showAll,
    setShowAll,
  ] =
    useState(
      false
    );


  const maxPeserta =
    useMemo(
      () =>
        Math.max(
          ...data.map(
            (
              item
            ) =>
              angka(
                item.peserta
              )
          ),
          1
        ),
      [
        data,
      ]
    );


  const rows =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();


        const result =
          data.filter(
            (
              item
            ) =>
              !keyword ||
              String(
                item.jurusan ??
                ''
              )
                .toLowerCase()
                .includes(
                  keyword
                )
          );


        result.sort(
          (
            a,
            b
          ) => {
            if (
              sort === 'pendaftar'
            ) {
              return (
                angka(
                  b.pendaftar
                ) -
                angka(
                  a.pendaftar
                )
              );
            }


            if (
              sort === 'aktif'
            ) {
              return (
                angka(
                  b.aktif
                ) -
                angka(
                  a.aktif
                )
              );
            }


            if (
              sort === 'selesai'
            ) {
              return (
                angka(
                  b.selesai
                ) -
                angka(
                  a.selesai
                )
              );
            }


            if (
              sort === 'nilai'
            ) {
              return (
                angka(
                  b.rata_nilai
                ) -
                angka(
                  a.rata_nilai
                )
              );
            }


            if (
              sort === 'az'
            ) {
              return String(
                a.jurusan ??
                ''
              ).localeCompare(
                String(
                  b.jurusan ??
                    ''
                ),
                'id-ID'
              );
            }


            return (
              angka(
                b.peserta
              ) -
              angka(
                a.peserta
              )
            );
          }
        );


        return result;
      },
      [
        data,
        search,
        sort,
      ]
    );


  const visibleRows =
    showAll
      ? rows
      : rows.slice(
          0,
          10
        );


  if (
    loading
  ) {
    return (
      <section className="mt-8">
        <div className="skeleton h-7 w-72 rounded-lg" />
        <div className="mt-4 skeleton h-80 rounded-3xl" />
      </section>
    );
  }


  return (
    <section className="mt-8">

      <ScrollReveal>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap
                size={20}
                className="text-purple-600"
              />

              <h2 className="text-base font-extrabold text-slate-800">
                Statistik Jurusan / Program Studi
              </h2>
            </div>

            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Analisis jurusan peserta
              magang berdasarkan jumlah
              peserta, status, nilai,
              dan distribusi divisi.
            </p>
          </div>
        </div>
      </ScrollReveal>


      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">
            Statistik jurusan gagal dimuat
          </p>

          <p className="mt-1 text-xs text-red-600">
            {
              error
            }
          </p>
        </div>
      )}


      {!error && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ScrollReveal delay={0}>
              <InsightCard
                label="Jurusan Terbanyak"
                value={
                  summary.jurusan_terbanyak ??
                  '—'
                }
                detail={`${angka(
                  summary.jumlah_terbanyak
                )} peserta magang`}
                Icon={GraduationCap}
                tone="indigo"
                onClick={
                  summary.jurusan_terbanyak
                    ? () =>
                        onOpenJurusan?.({
                          jurusan:
                            summary.jurusan_terbanyak,
                        })
                    : undefined
                }
              />
            </ScrollReveal>


            <ScrollReveal delay={40}>
              <InsightCard
                label="Total Jurusan"
                value={
                  <AnimatedNumber
                    value={
                      angka(
                        summary.total_jurusan
                      )
                    }
                    duration={350}
                  />
                }
                detail={`${angka(
                  summary.peserta_dengan_jurusan
                )} peserta memiliki data jurusan`}
                Icon={Users}
                tone="slate"
              />
            </ScrollReveal>


            <ScrollReveal delay={80}>
              <InsightCard
                label="Selesai Terbanyak"
                value={
                  summary.jurusan_selesai_terbanyak ??
                  '—'
                }
                detail={`${angka(
                  summary.jumlah_selesai_terbanyak
                )} peserta selesai`}
                Icon={Award}
                tone="green"
                onClick={
                  summary.jurusan_selesai_terbanyak
                    ? () =>
                        onOpenMetric?.(
                          {
                            jurusan:
                              summary.jurusan_selesai_terbanyak,
                          },
                          'selesai'
                        )
                    : undefined
                }
              />
            </ScrollReveal>


            <ScrollReveal delay={120}>
              <InsightCard
                label="Rata-rata Nilai"
                value={
                  summary.rata_nilai_keseluruhan ===
                    null ||
                  summary.rata_nilai_keseluruhan ===
                    undefined
                    ? '—'
                    : (
                      <AnimatedNumber
                        value={
                          summary.rata_nilai_keseluruhan
                        }
                        duration={400}
                        decimals={2}
                      />
                    )
                }
                detail={`${angka(
                  summary.peserta_sudah_dinilai
                )} peserta sudah dinilai`}
                Icon={Star}
                tone="amber"
              />
            </ScrollReveal>
          </div>


          <ScrollReveal>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800">
                      Ranking Jurusan
                    </h3>

                    <p className="mt-1 text-[10px] text-slate-400">
                      Urutan default berdasarkan jumlah peserta magang.
                    </p>
                  </div>


                  <div className="flex flex-col gap-2 sm:flex-row">
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
                        placeholder="Cari jurusan..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-600 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 sm:w-56"
                      />
                    </div>


                    <select
                      value={
                        sort
                      }
                      onChange={(
                        e
                      ) =>
                        setSort(
                          e.target.value
                        )
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="peserta">
                        Peserta Terbanyak
                      </option>

                      <option value="pendaftar">
                        Pendaftar Terbanyak
                      </option>

                      <option value="aktif">
                        Aktif Terbanyak
                      </option>

                      <option value="selesai">
                        Selesai Terbanyak
                      </option>

                      <option value="nilai">
                        Nilai Tertinggi
                      </option>

                      <option value="az">
                        Nama A–Z
                      </option>
                    </select>
                  </div>
                </div>
              </div>


              {visibleRows.map(
                (
                  item,
                  index
                ) => {
                  const totalPeserta =
                    angka(
                      item.peserta
                    );


                  const barWidth =
                    Math.max(
                      (
                        totalPeserta /
                        maxPeserta
                      ) *
                        100,
                      totalPeserta >
                        0
                        ? 3
                        : 0
                    );


                  return (
                    <ScrollReveal
                      key={`${item.jurusan}-${index}`}
                      delay={
                        Math.min(
                          index *
                            35,
                          175
                        )
                      }
                      distance={10}
                    >
                      <div className="border-b border-slate-100 p-4 transition-colors duration-150 hover:bg-purple-50/20 sm:p-5">
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(260px,1.2fr)_minmax(420px,2fr)]">

                          <button
                            type="button"
                            onClick={() =>
                              onOpenJurusan?.(
                                item
                              )
                            }
                            className="group flex w-full items-start gap-3 text-left"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xs font-extrabold text-purple-600 transition-transform duration-150 group-hover:scale-105">
                              #
                              {
                                index +
                                1
                              }
                            </span>


                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-slate-800 group-hover:text-purple-700">
                                {
                                  item.jurusan
                                }
                              </p>


                              <p className="mt-1 text-[10px] text-slate-400">
                                <AnimatedNumber
                                  value={
                                    totalPeserta
                                  }
                                  duration={350}
                                />{' '}
                                peserta ·{' '}

                                <AnimatedNumber
                                  value={
                                    angka(
                                      item.pendaftar
                                    )
                                  }
                                  duration={350}
                                />{' '}
                                pendaftar
                              </p>


                              <div className="mt-3">
                                <AnimatedProgressBar
                                  width={
                                    barWidth
                                  }
                                  delay={
                                    index *
                                    30
                                  }
                                />
                              </div>


                              <div className="mt-2 text-[9px] text-slate-400">
                                Konversi{' '}

                                <b>
                                  {persen(
                                    item.tingkat_konversi
                                  )}
                                </b>{' '}

                                · Nilai{' '}

                                <b>
                                  {nilai(
                                    item.rata_nilai
                                  )}
                                </b>
                              </div>
                            </div>
                          </button>


                          <div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <MetricButton
                                label="Pendaftar"
                                value={
                                  item.pendaftar
                                }
                                tone="indigo"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'pendaftar'
                                  )
                                }
                              />

                              <MetricButton
                                label="Peserta"
                                value={
                                  item.peserta
                                }
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'peserta'
                                  )
                                }
                              />

                              <MetricButton
                                label="Aktif"
                                value={
                                  item.aktif
                                }
                                tone="green"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'aktif'
                                  )
                                }
                              />

                              <MetricButton
                                label="Selesai"
                                value={
                                  item.selesai
                                }
                                tone="green"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'selesai'
                                  )
                                }
                              />

                              <MetricButton
                                label="Pending"
                                value={
                                  item.pending
                                }
                                tone="amber"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'pending'
                                  )
                                }
                              />

                              <MetricButton
                                label="Diterima"
                                value={
                                  item.diterima
                                }
                                tone="green"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'diterima'
                                  )
                                }
                              />

                              <MetricButton
                                label="Ditolak"
                                value={
                                  item.ditolak
                                }
                                tone="red"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'ditolak'
                                  )
                                }
                              />

                              <MetricButton
                                label="Nonaktif"
                                value={
                                  item.nonaktif
                                }
                                tone="red"
                                onClick={() =>
                                  onOpenMetric?.(
                                    item,
                                    'nonaktif'
                                  )
                                }
                              />
                            </div>


                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {DIVISION_META.map(
                                (
                                  division
                                ) => (
                                  <div
                                    key={
                                      division.key
                                    }
                                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-[9px]"
                                  >
                                    <span>
                                      {
                                        division.icon
                                      }{' '}

                                      {
                                        division.short
                                      }
                                    </span>

                                    <b>
                                      <AnimatedNumber
                                        value={
                                          angka(
                                            item[
                                              division.key
                                            ]
                                          )
                                        }
                                        duration={350}
                                      />
                                    </b>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                }
              )}


              {rows.length >
                10 && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAll(
                        (
                          previous
                        ) =>
                          !previous
                      )
                    }
                    className="rounded-xl bg-purple-50 px-4 py-2 text-[10px] font-bold text-purple-700 transition duration-150 hover:bg-purple-100"
                  >
                    {showAll
                      ? 'Tampilkan 10 Teratas'
                      : `Tampilkan Semua (${rows.length})`}
                  </button>
                </div>
              )}
            </div>
          </ScrollReveal>
        </>
      )}
    </section>
  );
}