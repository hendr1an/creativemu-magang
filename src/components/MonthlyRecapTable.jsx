import {
  useMemo,
  useState,
} from 'react';

import {
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';


const DIVISION_META = {
  Admin: {
    short:
      'A',

    icon:
      '📋',

    key:
      'div_admin',
  },

  Sosmed: {
    short:
      'S',

    icon:
      '📱',

    key:
      'div_sosmed',
  },

  Marketplace: {
    short:
      'M',

    icon:
      '🛒',

    key:
      'div_marketplace',
  },

  'Web Developer': {
    short:
      'W',

    icon:
      '💻',

    key:
      'div_webdev',
  },
};


const STATUS_FILTERS = {
  Semua:
    null,

  Approved:
    'diterima',

  Pending:
    'pending',

  Rejected:
    'ditolak',
};


const SORT_META = {
  bulan: {
    label:
      'Bulan',

    get:
      (
        row
      ) =>
        String(
          row.bulan ??
          ''
        ),
  },

  pendaftar: {
    label:
      'Pendaftar',

    get:
      (
        row
      ) =>
        Number(
          row.total_pendaftar ??
          0
        ),
  },

  diterima: {
    label:
      'Diterima',

    get:
      (
        row
      ) =>
        Number(
          row.diterima ??
          0
        ),
  },

  pending: {
    label:
      'Pending',

    get:
      (
        row
      ) =>
        Number(
          row.pending ??
          0
        ),
  },

  ditolak: {
    label:
      'Ditolak',

    get:
      (
        row
      ) =>
        Number(
          row.ditolak ??
          0
        ),
  },

  peserta_mulai: {
    label:
      'Mulai Magang',

    get:
      (
        row
      ) =>
        Number(
          row.peserta_mulai ??
          0
        ),
  },

  penonaktifan: {
    label:
      'Nonaktif',

    get:
      (
        row
      ) =>
        Number(
          row.penonaktifan ??
          0
        ),
  },
};


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


function namaBulan(
  bulan
) {
  if (
    !bulan ||
    !/^\d{4}-\d{2}$/.test(
      bulan
    )
  ) {
    return bulan ??
      '—';
  }


  const [
    year,
    month,
  ] =
    bulan
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
        year,
        month - 1,
        1
      )
    )
  );
}


function monthNameOnly(
  month
) {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month:
        'long',

      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(
      Date.UTC(
        2026,
        month - 1,
        1
      )
    )
  );
}


function SortButton({
  sortKey,
  currentKey,
  direction,
  onSort,
  children,
  align =
    'center',
}) {
  const active =
    sortKey ===
    currentKey;


  return (
    <button
      type="button"
      onClick={() =>
        onSort(
          sortKey
        )
      }
      className={`inline-flex items-center gap-1 font-bold transition ${
        align ===
        'left'
          ? 'justify-start'
          : 'justify-center'
      } ${
        active
          ? 'text-indigo-600'
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <span>
        {
          children
        }
      </span>


      {active ? (
        direction ===
        'asc' ? (
          <ChevronUp
            size={
              12
            }
            strokeWidth={
              2.5
            }
          />
        ) : (
          <ChevronDown
            size={
              12
            }
            strokeWidth={
              2.5
            }
          />
        )
      ) : (
        <span className="text-[9px] opacity-40">
          ↕
        </span>
      )}
    </button>
  );
}


function MetricButton({
  value,
  tone,
  onClick,
  title,
}) {
  const tones = {
    indigo:
      'text-indigo-600 hover:bg-indigo-50',

    green:
      'text-green-600 hover:bg-green-50',

    amber:
      'text-amber-600 hover:bg-amber-50',

    red:
      'text-red-500 hover:bg-red-50',

    slate:
      'text-slate-600 hover:bg-slate-100',
  };


  return (
    <button
      type="button"
      onClick={
        onClick
      }
      title={
        title
      }
      className={`mx-auto flex h-9 min-w-10 items-center justify-center rounded-lg px-2 text-center text-sm font-extrabold tabular-nums transition active:scale-95 ${
        tones[
          tone
        ] ??
        tones.slate
      }`}
    >
      {
        angka(
          value
        )
      }
    </button>
  );
}


export default function MonthlyRecapTable({
  data =
    [],

  filters,

  updateFilter,

  resetFilters,

  sortKey,

  sortDirection,

  onSort,

  onMetricClick,

  onDivisionClick,
}) {
  const [
    hideEmpty,
    setHideEmpty,
  ] =
    useState(
      false
    );


  const yearOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            data
              .map(
                (
                  row
                ) =>
                  String(
                    row.bulan ??
                    ''
                  ).slice(
                    0,
                    4
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            Number(
              b
            ) -
            Number(
              a
            )
        ),
      [
        data,
      ]
    );


  const monthOptions =
    useMemo(
      () =>
        Array.from(
          {
            length:
              12,
          },
          (
            _,
            index
          ) => ({
            value:
              String(
                index +
                1
              ).padStart(
                2,
                '0'
              ),

            label:
              monthNameOnly(
                index +
                1
              ),
          })
        ),
      []
    );


  const hasil =
    useMemo(
      () => {
        let rows =
          [
            ...data,
          ];


        /* =========================
           YEAR FILTER
        ========================= */

        if (
          filters.tahun !==
          'Semua'
        ) {
          rows =
            rows.filter(
              (
                row
              ) =>
                String(
                  row.bulan
                ).startsWith(
                  `${filters.tahun}-`
                )
            );
        }


        /* =========================
           MONTH FILTER
        ========================= */

        if (
          filters.bulan !==
          'Semua'
        ) {
          rows =
            rows.filter(
              (
                row
              ) =>
                String(
                  row.bulan
                ).slice(
                  5,
                  7
                ) ===
                filters.bulan
            );
        }


        /* =========================
           DIVISION FILTER
        ========================= */

        if (
          filters.divisi !==
          'Semua'
        ) {
          const key =
            DIVISION_META[
              filters.divisi
            ]?.key;


          if (key) {
            rows =
              rows.filter(
                (
                  row
                ) =>
                  angka(
                    row[
                      key
                    ]
                  ) >
                  0
              );
          }
        }


        /* =========================
           STATUS FILTER
        ========================= */

        const statusKey =
          STATUS_FILTERS[
            filters.status
          ];


        if (
          statusKey
        ) {
          rows =
            rows.filter(
              (
                row
              ) =>
                angka(
                  row[
                    statusKey
                  ]
                ) >
                0
            );
        }


        /* =========================
           EMPTY MONTH
        ========================= */

        if (
          hideEmpty
        ) {
          rows =
            rows.filter(
              (
                row
              ) =>
                angka(
                  row.total_pendaftar
                ) >
                  0 ||
                angka(
                  row.peserta_mulai
                ) >
                  0 ||
                angka(
                  row.penonaktifan
                ) >
                  0
            );
        }


        /* =========================
           SORT
        ========================= */

        const meta =
          SORT_META[
            sortKey
          ] ??
          SORT_META.bulan;


        rows.sort(
          (
            a,
            b
          ) => {
            const av =
              meta.get(
                a
              );

            const bv =
              meta.get(
                b
              );


            let result;


            if (
              typeof av ===
                'number' &&
              typeof bv ===
                'number'
            ) {
              result =
                av -
                bv;
            } else {
              result =
                String(
                  av
                ).localeCompare(
                  String(
                    bv
                  )
                );
            }


            return sortDirection ===
              'asc'
              ? result
              : -result;
          }
        );


        return rows;
      },
      [
        data,
        filters,
        hideEmpty,
        sortKey,
        sortDirection,
      ]
    );


  const activeCount =
    [
      filters.tahun !==
        'Semua',

      filters.bulan !==
        'Semua',

      filters.divisi !==
        'Semua',

      filters.status !==
        'Semua',

      hideEmpty,
    ].filter(
      Boolean
    ).length;


  function resetSemua() {
    resetFilters();

    setHideEmpty(
      false
    );
  }


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <SlidersHorizontal
                  size={
                    19
                  }
                />
              </span>


              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  Rekap Bulanan
                </h2>

                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  Filter, urutkan,
                  lalu klik angka
                  untuk membuka
                  data penyusunnya.
                </p>
              </div>
            </div>
          </div>


          <div className="flex items-center gap-2">
            {activeCount >
              0 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600">
                <Filter
                  size={
                    10
                  }
                  className="mr-1 inline"
                />

                {
                  activeCount
                }{' '}
                filter aktif
              </span>
            )}


            <button
              type="button"
              onClick={
                resetSemua
              }
              disabled={
                activeCount ===
                0
              }
              className="btn-press inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw
                size={
                  13
                }
              />

              Reset
            </button>
          </div>
        </div>


        {/* =================================================
            FILTER PANEL
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {/* YEAR */}

          <label className="block">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Tahun
            </span>

            <select
              value={
                filters.tahun
              }
              onChange={(
                e
              ) =>
                updateFilter(
                  'tahun',
                  e.target
                    .value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Semua">
                Semua Tahun
              </option>

              {yearOptions.map(
                (
                  year
                ) => (
                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {
                      year
                    }
                  </option>
                )
              )}
            </select>
          </label>


          {/* MONTH */}

          <label className="block">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Bulan
            </span>

            <select
              value={
                filters.bulan
              }
              onChange={(
                e
              ) =>
                updateFilter(
                  'bulan',
                  e.target
                    .value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Semua">
                Semua Bulan
              </option>

              {monthOptions.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>
          </label>


          {/* DIVISION */}

          <label className="block">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Fokus Divisi
            </span>

            <select
              value={
                filters.divisi
              }
              onChange={(
                e
              ) =>
                updateFilter(
                  'divisi',
                  e.target
                    .value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Semua">
                Semua Divisi
              </option>

              {Object.keys(
                DIVISION_META
              ).map(
                (
                  divisi
                ) => (
                  <option
                    key={
                      divisi
                    }
                    value={
                      divisi
                    }
                  >
                    {
                      divisi
                    }
                  </option>
                )
              )}
            </select>
          </label>


          {/* STATUS */}

          <label className="block">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Status Pendaftaran
            </span>

            <select
              value={
                [
                  'Semua',
                  'Approved',
                  'Pending',
                  'Rejected',
                ].includes(
                  filters.status
                )
                  ? filters.status
                  : 'Semua'
              }
              onChange={(
                e
              ) =>
                updateFilter(
                  'status',
                  e.target
                    .value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Semua">
                Semua Status
              </option>

              <option value="Approved">
                Diterima
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Rejected">
                Ditolak
              </option>
            </select>
          </label>


          {/* HIDE EMPTY */}

          <label className="flex cursor-pointer items-end">
            <span className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition hover:bg-slate-100">
              <input
                type="checkbox"
                checked={
                  hideEmpty
                }
                onChange={(
                  e
                ) =>
                  setHideEmpty(
                    e.target
                      .checked
                  )
                }
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
              />

              <span className="text-[10px] font-bold leading-tight text-slate-600">
                Sembunyikan
                bulan kosong
              </span>
            </span>
          </label>
        </div>


        {filters.divisi !==
          'Semua' && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-blue-700">
              💡 Fokus divisi{' '}

              <b>
                {
                  filters.divisi
                }
              </b>{' '}

              menyaring bulan
              yang memiliki
              aktivitas divisi
              tersebut. Angka
              statistik tetap
              merupakan total
              bulanan.
            </p>
          </div>
        )}
      </div>


      {/* =================================================
          RESULT SUMMARY
      ================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <p className="text-[10px] font-medium text-slate-500">
          Menampilkan{' '}

          <b className="text-slate-700">
            {
              hasil.length
            }
          </b>{' '}

          dari{' '}

          <b className="text-slate-700">
            {
              data.length
            }
          </b>{' '}

          bulan
        </p>


        <p className="text-[10px] font-medium text-slate-400">
          Urutan:{' '}

          <b className="text-indigo-600">
            {SORT_META[
              sortKey
            ]?.label ??
              'Bulan'}
          </b>{' '}

          {sortDirection ===
          'asc'
            ? '↑'
            : '↓'}
        </p>
      </div>


      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed text-xs">

          {/*
            Fixed column widths = posisi header dan isi
            selalu presisi.

            Total = 100%
          */}
          <colgroup>
            <col className="w-[17%]" />

            <col className="w-[9%]" />

            <col className="w-[9%]" />

            <col className="w-[9%]" />

            <col className="w-[9%]" />

            <col className="w-[10%]" />

            <col className="w-[9%]" />

            <col className="w-[28%]" />
          </colgroup>


          <thead className="bg-white text-[10px] uppercase tracking-wider">
            <tr className="border-b border-slate-100">

              {/* BULAN */}

              <th className="px-5 py-4 text-left align-middle">
                <SortButton
                  sortKey="bulan"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                  align="left"
                >
                  Bulan
                </SortButton>
              </th>


              {/* PENDAFTAR */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="pendaftar"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Pendaftar
                </SortButton>
              </th>


              {/* DITERIMA */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="diterima"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Diterima
                </SortButton>
              </th>


              {/* PENDING */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="pending"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Pending
                </SortButton>
              </th>


              {/* DITOLAK */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="ditolak"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Ditolak
                </SortButton>
              </th>


              {/* MULAI */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="peserta_mulai"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Mulai Magang
                </SortButton>
              </th>


              {/* NONAKTIF */}

              <th className="px-2 py-4 text-center align-middle">
                <SortButton
                  sortKey="penonaktifan"
                  currentKey={
                    sortKey
                  }
                  direction={
                    sortDirection
                  }
                  onSort={
                    onSort
                  }
                >
                  Nonaktif
                </SortButton>
              </th>


              {/* DIVISI */}

              <th className="px-4 py-4 text-center align-middle">
                <span className="font-bold text-slate-400">
                  Divisi
                </span>
              </th>
            </tr>
          </thead>


          <tbody className="divide-y divide-slate-100">
            {hasil.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    8
                  }
                  className="px-4 py-14 text-center"
                >
                  <p className="text-3xl">
                    🔎
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-600">
                    Tidak Ada Hasil
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Coba ubah
                    atau reset
                    filter.
                  </p>
                </td>
              </tr>
            ) : (
              hasil.map(
                (
                  item
                ) => (
                  <tr
                    key={
                      item.bulan
                    }
                    className="group h-[72px] transition hover:bg-indigo-50/30"
                  >

                    {/* BULAN */}

                    <td className="px-5 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pendaftar'
                          )
                        }
                        className="group/month block w-full text-left"
                      >
                        <p className="whitespace-nowrap text-sm font-extrabold text-slate-700 transition group-hover/month:text-indigo-600">
                          {namaBulan(
                            item.bulan
                          )}
                        </p>

                        <p className="mt-1 whitespace-nowrap text-[9px] font-semibold text-slate-400">
                          Klik untuk eksplorasi
                        </p>
                      </button>
                    </td>


                    {/* PENDAFTAR */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.total_pendaftar
                        }
                        tone="indigo"
                        title="Lihat pendaftar bulan ini"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pendaftar'
                          )
                        }
                      />
                    </td>


                    {/* DITERIMA */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.diterima
                        }
                        tone="green"
                        title="Lihat pendaftar diterima"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'diterima'
                          )
                        }
                      />
                    </td>


                    {/* PENDING */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.pending
                        }
                        tone="amber"
                        title="Lihat pendaftar pending"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pending'
                          )
                        }
                      />
                    </td>


                    {/* DITOLAK */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.ditolak
                        }
                        tone="red"
                        title="Lihat pendaftar ditolak"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'ditolak'
                          )
                        }
                      />
                    </td>


                    {/* MULAI */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.peserta_mulai
                        }
                        tone="slate"
                        title="Lihat peserta mulai magang"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'mulai'
                          )
                        }
                      />
                    </td>


                    {/* NONAKTIF */}

                    <td className="px-2 py-3 text-center align-middle">
                      <MetricButton
                        value={
                          item.penonaktifan
                        }
                        tone="red"
                        title="Lihat penonaktifan bulan ini"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'nonaktif'
                          )
                        }
                      />
                    </td>


                    {/* DIVISI */}

                    <td className="px-4 py-3 align-middle">
                      <div className="grid w-full grid-cols-4 gap-2">
                        {Object.entries(
                          DIVISION_META
                        ).map(
                          (
                            [
                              divisi,
                              meta,
                            ]
                          ) => {
                            const value =
                              angka(
                                item[
                                  meta.key
                                ]
                              );


                            const active =
                              filters.divisi ===
                              divisi;


                            return (
                              <button
                                key={
                                  divisi
                                }
                                type="button"
                                onClick={() =>
                                  onDivisionClick?.(
                                    item,
                                    divisi
                                  )
                                }
                                title={`${divisi}: ${value}`}
                                className={`flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl px-2 text-[9px] font-bold tabular-nums transition active:scale-95 ${
                                  active
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : value >
                                        0
                                      ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                      : 'bg-slate-50 text-slate-300'
                                }`}
                              >
                                <span>
                                  {
                                    meta.icon
                                  }
                                </span>

                                <span>
                                  {
                                    meta.short
                                  }
                                </span>

                                <span>
                                  {
                                    value
                                  }
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>


      {/* =================================================
          LEGEND
      ================================================= */}

      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-[9px] font-medium text-slate-400">
          <span>
            📋 A = Admin
          </span>

          <span>
            📱 S = Sosmed
          </span>

          <span>
            🛒 M = Marketplace
          </span>

          <span>
            💻 W = Web Developer
          </span>
        </div>
      </div>
    </section>
  );
}