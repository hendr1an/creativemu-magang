import {
  useMemo,
  useState,
} from 'react';

import {
  ArrowUpRight,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';


const METRICS = {
  pendaftar: {
    label:
      'Pendaftar',

    shortLabel:
      'Pendaftar',

    dataKey:
      'total_pendaftar',

    text:
      'text-indigo-600',

    bg:
      'bg-indigo-50',

    ring:
      'ring-indigo-200',

    stroke:
      '#6366f1',

    fillStart:
      '#818cf8',

    fillEnd:
      '#818cf800',
  },

  diterima: {
    label:
      'Diterima',

    shortLabel:
      'Diterima',

    dataKey:
      'diterima',

    text:
      'text-emerald-600',

    bg:
      'bg-emerald-50',

    ring:
      'ring-emerald-200',

    stroke:
      '#10b981',

    fillStart:
      '#34d399',

    fillEnd:
      '#34d39900',
  },

  pending: {
    label:
      'Pending',

    shortLabel:
      'Pending',

    dataKey:
      'pending',

    text:
      'text-amber-600',

    bg:
      'bg-amber-50',

    ring:
      'ring-amber-200',

    stroke:
      '#f59e0b',

    fillStart:
      '#fbbf24',

    fillEnd:
      '#fbbf2400',
  },

  ditolak: {
    label:
      'Ditolak',

    shortLabel:
      'Ditolak',

    dataKey:
      'ditolak',

    text:
      'text-red-500',

    bg:
      'bg-red-50',

    ring:
      'ring-red-200',

    stroke:
      '#ef4444',

    fillStart:
      '#f87171',

    fillEnd:
      '#f8717100',
  },

  mulai: {
    label:
      'Mulai Magang',

    shortLabel:
      'Mulai',

    dataKey:
      'peserta_mulai',

    text:
      'text-blue-600',

    bg:
      'bg-blue-50',

    ring:
      'ring-blue-200',

    stroke:
      '#3b82f6',

    fillStart:
      '#60a5fa',

    fillEnd:
      '#60a5fa00',
  },

  nonaktif: {
    label:
      'Nonaktif',

    shortLabel:
      'Nonaktif',

    dataKey:
      'penonaktifan',

    text:
      'text-rose-600',

    bg:
      'bg-rose-50',

    ring:
      'ring-rose-200',

    stroke:
      '#e11d48',

    fillStart:
      '#fb7185',

    fillEnd:
      '#fb718500',
  },
};


function angka(
  value
) {
  const result =
    Number(
      value ??
        0
    );

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}


function namaBulanPendek(
  value
) {
  if (
    !value ||
    !/^\d{4}-\d{2}$/.test(
      value
    )
  ) {
    return value ??
      '';
  }

  const [
    tahun,
    bulan,
  ] =
    value
      .split('-')
      .map(Number);

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month:
        'short',

      year:
        '2-digit',

      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        1
      )
    )
  );
}


function namaBulanPanjang(
  value
) {
  if (
    !value ||
    !/^\d{4}-\d{2}$/.test(
      value
    )
  ) {
    return value ??
      '';
  }

  const [
    tahun,
    bulan,
  ] =
    value
      .split('-')
      .map(Number);

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month:
        'long',

      year:
        'numeric',

      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        1
      )
    )
  );
}


export default function MonthlyRegistrationChart({
  data = [],
  metric = 'pendaftar',
  onMetricChange,
  onMonthClick,
}) {
  const [
    hoverIndex,
    setHoverIndex,
  ] =
    useState(
      null
    );


  const meta =
    METRICS[
      metric
    ] ??
    METRICS.pendaftar;


  /*
    Penting:

    Kita sort sendiri berdasarkan YYYY-MM agar grafik
    SELALU berjalan kiri → kanan secara kronologis,
    terlepas dari urutan JSON yang dikembalikan RPC.
  */
  const sortedData =
    useMemo(
      () =>
        [
          ...data,
        ].sort(
          (
            a,
            b
          ) =>
            String(
              a.bulan
            ).localeCompare(
              String(
                b.bulan
              )
            )
        ),
      [
        data,
      ]
    );


  const values =
    useMemo(
      () =>
        sortedData.map(
          (
            item
          ) =>
            angka(
              item[
                meta.dataKey
              ]
            )
        ),
      [
        sortedData,
        meta.dataKey,
      ]
    );


  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    );


  const maxValue =
    Math.max(
      ...values,
      1
    );


  const lastValue =
    values.length
      ? values[
          values.length -
            1
        ]
      : 0;


  const previousValue =
    values.length >
    1
      ? values[
          values.length -
            2
        ]
      : null;


  const delta =
    previousValue ===
      null
      ? null
      : lastValue -
        previousValue;


  /*
    SVG coordinate system.
  */
  const WIDTH =
    1000;

  const HEIGHT =
    310;

  const LEFT =
    45;

  const RIGHT =
    20;

  const TOP =
    24;

  const BOTTOM =
    48;

  const graphWidth =
    WIDTH -
    LEFT -
    RIGHT;

  const graphHeight =
    HEIGHT -
    TOP -
    BOTTOM;


  const points =
    sortedData.map(
      (
        item,
        index
      ) => {
        const value =
          angka(
            item[
              meta.dataKey
            ]
          );


        const x =
          sortedData.length ===
          1
            ? LEFT +
              graphWidth /
                2
            : LEFT +
              (
                index /
                (
                  sortedData.length -
                  1
                )
              ) *
                graphWidth;


        const y =
          TOP +
          graphHeight -
          (
            value /
            maxValue
          ) *
            graphHeight;


        return {
          x,
          y,
          value,
          item,
        };
      }
    );


  const linePath =
    points.length
      ? points
          .map(
            (
              point,
              index
            ) =>
              `${
                index ===
                0
                  ? 'M'
                  : 'L'
              } ${point.x} ${point.y}`
          )
          .join(
            ' '
          )
      : '';


  const areaPath =
    points.length
      ? [
          `M ${points[0].x} ${
            TOP +
            graphHeight
          }`,

          ...points.map(
            (
              point
            ) =>
              `L ${point.x} ${point.y}`
          ),

          `L ${
            points[
              points.length -
                1
            ].x
          } ${
            TOP +
            graphHeight
          }`,

          'Z',
        ].join(
          ' '
        )
      : '';


  const labelStep =
    sortedData.length <=
    12
      ? 1
      : sortedData.length <=
          18
        ? 2
        : sortedData.length <=
            24
          ? 3
          : 4;


  const gridValues =
    [
      0,
      0.25,
      0.5,
      0.75,
      1,
    ];


  const hovered =
    hoverIndex !==
    null
      ? points[
          hoverIndex
        ]
      : null;


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      {/* HEADER */}

      <div className="border-b border-slate-100 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <TrendingUp
                  size={
                    18
                  }
                  className="text-indigo-600"
                />
              </span>

              <div>
                <h2 className="font-extrabold text-slate-800">
                  Pendaftaran
                  Bulanan
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Tren bulanan
                  interaktif —
                  arahkan atau
                  klik titik
                  untuk melihat
                  detail.
                </p>
              </div>
            </div>
          </div>


          {/* METRIC SELECTOR */}

          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
            {Object.entries(
              METRICS
            ).map(
              (
                [
                  key,
                  item,
                ]
              ) => {
                const active =
                  key ===
                  metric;


                return (
                  <button
                    key={
                      key
                    }
                    type="button"
                    onClick={() =>
                      onMetricChange?.(
                        key
                      )
                    }
                    className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold transition ${
                      active
                        ? `${item.bg} ${item.text} ring-1 ${item.ring}`
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {
                      item.shortLabel
                    }
                  </button>
                );
              }
            )}
          </div>
        </div>


        {/* SUMMARY */}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Metrik
            </p>

            <p
              className={`mt-1 text-sm font-extrabold ${meta.text}`}
            >
              {
                meta.label
              }
            </p>
          </div>


          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Total Periode
            </p>

            <p className="mt-1 text-sm font-extrabold text-slate-800">
              {
                total
              }
            </p>
          </div>


          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Bulan Terbaru
            </p>

            <p className="mt-1 text-sm font-extrabold text-slate-800">
              {
                lastValue
              }
            </p>
          </div>


          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Vs Bulan Sebelumnya
            </p>

            <p
              className={`mt-1 text-sm font-extrabold ${
                delta ===
                null
                  ? 'text-slate-500'
                  : delta >
                      0
                    ? 'text-green-600'
                    : delta <
                        0
                      ? 'text-red-500'
                      : 'text-slate-600'
              }`}
            >
              {delta ===
              null
                ? '—'
                : delta >
                    0
                  ? `+${delta}`
                  : delta}
            </p>
          </div>
        </div>
      </div>


      {/* CHART */}

      {sortedData.length ===
      0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <CalendarDays
            size={
              34
            }
            className="text-slate-300"
          />

          <p className="mt-3 text-sm font-bold text-slate-500">
            Belum Ada Data
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Data bulanan
            belum tersedia.
          </p>
        </div>
      ) : (
        <div className="relative px-2 pb-3 pt-4 sm:px-4">
          <div className="overflow-x-auto">
            <div className="relative min-w-[720px]">

              {/* TOOLTIP */}

              {hovered && (
                <div
                  className="pointer-events-none absolute z-20 w-48 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-100 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur"
                  style={{
                    left:
                      `${(
                        hovered.x /
                        WIDTH
                      ) *
                      100}%`,

                    top:
                      `${(
                        hovered.y /
                        HEIGHT
                      ) *
                      100}%`,
                  }}
                >
                  <p className="text-[10px] font-semibold text-slate-300">
                    {namaBulanPanjang(
                      hovered.item
                        .bulan
                    )}
                  </p>

                  <p className="mt-1 text-xl font-extrabold">
                    {
                      hovered.value
                    }
                  </p>

                  <p className="text-[10px] font-semibold text-slate-300">
                    {
                      meta.label
                    }
                  </p>

                  <div className="mt-2 border-t border-white/10 pt-2 text-[9px] leading-relaxed text-slate-300">
                    <p>
                      ✓ Diterima:{' '}
                      {angka(
                        hovered.item
                          .diterima
                      )}
                    </p>

                    <p>
                      ⏳ Pending:{' '}
                      {angka(
                        hovered.item
                          .pending
                      )}
                    </p>

                    <p>
                      ✕ Ditolak:{' '}
                      {angka(
                        hovered.item
                          .ditolak
                      )}
                    </p>

                    <p>
                      🚀 Mulai:{' '}
                      {angka(
                        hovered.item
                          .peserta_mulai
                      )}
                    </p>
                  </div>

                  <p className="mt-2 flex items-center gap-1 text-[9px] font-bold text-indigo-300">
                    Klik untuk
                    melihat data

                    <ArrowUpRight
                      size={
                        10
                      }
                    />
                  </p>
                </div>
              )}


              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label={`Grafik ${meta.label} bulanan`}
                onMouseLeave={() =>
                  setHoverIndex(
                    null
                  )
                }
              >
                <defs>
                  <linearGradient
                    id={`monthly-chart-${metric}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        meta.fillStart
                      }
                      stopOpacity="0.28"
                    />

                    <stop
                      offset="100%"
                      stopColor={
                        meta.fillEnd
                      }
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>


                {/* GRID */}

                {gridValues.map(
                  (
                    ratio
                  ) => {
                    const y =
                      TOP +
                      graphHeight -
                      ratio *
                        graphHeight;


                    const value =
                      Math.round(
                        maxValue *
                          ratio
                      );


                    return (
                      <g
                        key={
                          ratio
                        }
                      >
                        <line
                          x1={
                            LEFT
                          }
                          y1={
                            y
                          }
                          x2={
                            WIDTH -
                            RIGHT
                          }
                          y2={
                            y
                          }
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray={
                            ratio ===
                            0
                              ? '0'
                              : '4 5'
                          }
                        />

                        <text
                          x={
                            LEFT -
                            10
                          }
                          y={
                            y +
                            4
                          }
                          textAnchor="end"
                          fontSize="11"
                          fill="#94a3b8"
                        >
                          {
                            value
                          }
                        </text>
                      </g>
                    );
                  }
                )}


                {/* AREA */}

                <path
                  d={
                    areaPath
                  }
                  fill={`url(#monthly-chart-${metric})`}
                  className="transition-all duration-300"
                />


                {/* MAIN LINE */}

                <path
                  d={
                    linePath
                  }
                  fill="none"
                  stroke={
                    meta.stroke
                  }
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />


                {/* POINTS */}

                {points.map(
                  (
                    point,
                    index
                  ) => {
                    const active =
                      hoverIndex ===
                      index;


                    return (
                      <g
                        key={
                          point.item
                            .bulan
                        }
                        onMouseEnter={() =>
                          setHoverIndex(
                            index
                          )
                        }
                        onFocus={() =>
                          setHoverIndex(
                            index
                          )
                        }
                        onBlur={() =>
                          setHoverIndex(
                            null
                          )
                        }
                        onClick={() =>
                          onMonthClick?.(
                            point.item,
                            metric
                          )
                        }
                        className="cursor-pointer"
                        tabIndex={
                          0
                        }
                        role="button"
                      >
                        {/* enlarged invisible hit area */}

                        <circle
                          cx={
                            point.x
                          }
                          cy={
                            point.y
                          }
                          r="18"
                          fill="transparent"
                        />


                        {active && (
                          <circle
                            cx={
                              point.x
                            }
                            cy={
                              point.y
                            }
                            r="11"
                            fill={
                              meta.stroke
                            }
                            opacity="0.12"
                          />
                        )}


                        <circle
                          cx={
                            point.x
                          }
                          cy={
                            point.y
                          }
                          r={
                            active
                              ? 6
                              : 4
                          }
                          fill="white"
                          stroke={
                            meta.stroke
                          }
                          strokeWidth={
                            active
                              ? 4
                              : 3
                          }
                          className="transition-all duration-150"
                        />


                        {active && (
                          <text
                            x={
                              point.x
                            }
                            y={
                              point.y -
                              15
                            }
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="800"
                            fill={
                              meta.stroke
                            }
                          >
                            {
                              point.value
                            }
                          </text>
                        )}
                      </g>
                    );
                  }
                )}


                {/* X LABEL */}

                {points.map(
                  (
                    point,
                    index
                  ) => {
                    const shouldShow =
                      index %
                        labelStep ===
                        0 ||
                      index ===
                        points.length -
                          1;


                    if (
                      !shouldShow
                    ) {
                      return null;
                    }


                    return (
                      <text
                        key={`label-${point.item.bulan}`}
                        x={
                          point.x
                        }
                        y={
                          HEIGHT -
                          14
                        }
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        {namaBulanPendek(
                          point.item
                            .bulan
                        )}
                      </text>
                    );
                  }
                )}
              </svg>
            </div>
          </div>


          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400">
              Grafik selalu
              diurutkan dari
              bulan paling lama
              → terbaru.
            </p>

            <p className="text-[10px] font-semibold text-indigo-500">
              ● Klik titik untuk
              drill-down
            </p>
          </div>
        </div>
      )}
    </section>
  );
}