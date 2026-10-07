import {
  useMemo,
  useState,
} from 'react';

import {
  ChevronDown,
  ChevronUp,
  EyeOff,
} from 'lucide-react';


const DIVISION_META = {
  Admin: {
    short: 'A',
    icon: '📋',
    key: 'div_admin',
  },

  Sosmed: {
    short: 'S',
    icon: '📱',
    key: 'div_sosmed',
  },

  Marketplace: {
    short: 'M',
    icon: '🛒',
    key: 'div_marketplace',
  },

  'Web Developer': {
    short: 'W',
    icon: '💻',
    key: 'div_webdev',
  },
};


const SORT_META = {
  bulan: {
    label: 'Bulan',

    get: (row) =>
      String(
        row.bulan ??
        ''
      ),
  },

  pendaftar: {
    label: 'Pendaftar',

    get: (row) =>
      Number(
        row.total_pendaftar ??
        0
      ),
  },

  diterima: {
    label: 'Diterima',

    get: (row) =>
      Number(
        row.diterima ??
        0
      ),
  },

  pending: {
    label: 'Pending',

    get: (row) =>
      Number(
        row.pending ??
        0
      ),
  },

  ditolak: {
    label: 'Ditolak',

    get: (row) =>
      Number(
        row.ditolak ??
        0
      ),
  },

  peserta_mulai: {
    label: 'Mulai Magang',

    get: (row) =>
      Number(
        row.peserta_mulai ??
        0
      ),
  },

  penonaktifan: {
    label: 'Nonaktif',

    get: (row) =>
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
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
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


function SortButton({
  sortKey,
  currentKey,
  direction,
  onSort,
  children,
  align = 'center',
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
            size={12}
            strokeWidth={2.5}
          />
        ) : (
          <ChevronDown
            size={12}
            strokeWidth={2.5}
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
  data = [],

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


  const hasil =
    useMemo(
      () => {
        let rows =
          [
            ...data,
          ];


        if (
          hideEmpty
        ) {
          rows =
            rows.filter(
              (row) =>
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
        hideEmpty,
        sortKey,
        sortDirection,
      ]
    );


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Rekap Bulanan
          </h2>

          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Data sudah mengikuti
            Filter Statistik global
            di bagian atas halaman.
            Klik angka untuk membuka
            data penyusunnya.
          </p>
        </div>


        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={
              hideEmpty
            }
            onChange={(
              e
            ) =>
              setHideEmpty(
                e.target.checked
              )
            }
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />

          <EyeOff
            size={13}
            className="text-slate-400"
          />

          <span className="text-[9px] font-bold text-slate-600">
            Sembunyikan bulan kosong
          </span>
        </label>
      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <p className="text-[10px] font-medium text-slate-500">
          Menampilkan{' '}

          <b className="text-slate-700">
            {
              hasil.length
            }
          </b>{' '}

          periode
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
              <th className="px-5 py-4 text-left">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-2 py-4 text-center">
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


              <th className="px-4 py-4 text-center font-bold text-slate-400">
                Divisi
              </th>
            </tr>
          </thead>


          <tbody className="divide-y divide-slate-100">
            {hasil.length ===
            0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-14 text-center"
                >
                  <p className="text-3xl">
                    📭
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-600">
                    Tidak ada data
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Coba ubah Filter
                    Statistik global.
                  </p>
                </td>
              </tr>
            ) : (
              hasil.map(
                (item) => (
                  <tr
                    key={
                      item.bulan
                    }
                    className="h-[72px] transition hover:bg-indigo-50/30"
                  >
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pendaftar'
                          )
                        }
                        className="block w-full text-left"
                      >
                        <p className="whitespace-nowrap text-sm font-extrabold text-slate-700 hover:text-indigo-600">
                          {namaBulan(
                            item.bulan
                          )}
                        </p>

                        <p className="mt-1 text-[9px] font-semibold text-slate-400">
                          Klik untuk eksplorasi
                        </p>
                      </button>
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.total_pendaftar
                        }
                        tone="indigo"
                        title="Lihat pendaftar"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pendaftar'
                          )
                        }
                      />
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.diterima
                        }
                        tone="green"
                        title="Lihat diterima"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'diterima'
                          )
                        }
                      />
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.pending
                        }
                        tone="amber"
                        title="Lihat pending"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'pending'
                          )
                        }
                      />
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.ditolak
                        }
                        tone="red"
                        title="Lihat ditolak"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'ditolak'
                          )
                        }
                      />
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.peserta_mulai
                        }
                        tone="slate"
                        title="Lihat peserta mulai"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'mulai'
                          )
                        }
                      />
                    </td>


                    <td className="px-2 py-3 text-center">
                      <MetricButton
                        value={
                          item.penonaktifan
                        }
                        tone="red"
                        title="Lihat penonaktifan"
                        onClick={() =>
                          onMetricClick?.(
                            item,
                            'nonaktif'
                          )
                        }
                      />
                    </td>


                    <td className="px-4 py-3">
                      <div className="grid w-full grid-cols-4 gap-2">
                        {Object.entries(
                          DIVISION_META
                        ).map(
                          ([
                            divisi,
                            meta,
                          ]) => {
                            const value =
                              angka(
                                item[
                                  meta.key
                                ]
                              );


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
                                className={`flex h-9 items-center justify-center gap-1 rounded-xl px-2 text-[9px] font-bold tabular-nums transition active:scale-95 ${
                                  value >
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


      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
        <div className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-[9px] font-medium text-slate-400">
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