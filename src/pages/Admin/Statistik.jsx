import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  Clock3,
  RefreshCw,
  UserMinus,
  Users,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import StatistikDetailModal from '../../components/StatistikDetailModal';
import MonthlyRegistrationChart from '../../components/MonthlyRegistrationChart';
import MonthlyRecapTable from '../../components/MonthlyRecapTable';
import DivisionInstitutionAnalytics from '../../components/DivisionInstitutionAnalytics';
import YearlySuspensionAnalytics from '../../components/YearlySuspensionAnalytics';

import {
  useStatistikFilters,
} from '../../hooks/useStatistikFilters';

import {
  DETAIL_KIND,
  loadStatistikDetail,
  namaBulanDetail,
} from '../../lib/statisticsExplorer';


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


function persen(
  value
) {
  const n =
    Number(
      value
    );

  if (
    !Number.isFinite(
      n
    )
  ) {
    return '0%';
  }

  return `${Number(
    n.toFixed(
      2
    )
  )}%`;
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

  if (
    !Number.isFinite(
      n
    )
  ) {
    return '—';
  }

  return n.toFixed(
    2
  );
}


function tanggalWaktu(
  iso
) {
  if (!iso) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',

      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(
      iso
    )
  );
}


/* =========================================================
   INTERACTIVE SUMMARY CARD
========================================================= */

function KartuRingkasan({
  label,
  value,
  detail,
  Icon,
  tone = 'slate',
  onClick,
}) {
  const toneClass =
    {
      indigo: {
        bg:
          'bg-indigo-50',

        icon:
          'text-indigo-600',

        value:
          'text-indigo-700',

        hover:
          'hover:border-indigo-200 hover:bg-indigo-50/30',

        detail:
          'text-indigo-500',

        line:
          'bg-indigo-500',
      },

      green: {
        bg:
          'bg-green-50',

        icon:
          'text-green-600',

        value:
          'text-green-700',

        hover:
          'hover:border-green-200 hover:bg-green-50/30',

        detail:
          'text-green-600',

        line:
          'bg-green-500',
      },

      amber: {
        bg:
          'bg-amber-50',

        icon:
          'text-amber-600',

        value:
          'text-amber-700',

        hover:
          'hover:border-amber-200 hover:bg-amber-50/30',

        detail:
          'text-amber-600',

        line:
          'bg-amber-500',
      },

      red: {
        bg:
          'bg-red-50',

        icon:
          'text-red-600',

        value:
          'text-red-700',

        hover:
          'hover:border-red-200 hover:bg-red-50/30',

        detail:
          'text-red-500',

        line:
          'bg-red-500',
      },

      slate: {
        bg:
          'bg-slate-50',

        icon:
          'text-slate-600',

        value:
          'text-slate-800',

        hover:
          'hover:border-slate-300 hover:bg-slate-50',

        detail:
          'text-slate-500',

        line:
          'bg-slate-400',
      },
    }[
      tone
    ];


  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`group anim-up card-hover relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${toneClass.hover}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {
              label
            }
          </p>

          <p
            className={`mt-2 text-3xl font-extrabold ${toneClass.value}`}
          >
            {
              value
            }
          </p>

          {detail && (
            <p className="mt-1 text-xs text-slate-400">
              {
                detail
              }
            </p>
          )}

          <div
            className={`mt-3 flex items-center gap-1 text-[10px] font-bold ${toneClass.detail}`}
          >
            Lihat detail

            <ChevronRight
              size={
                13
              }
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </div>
        </div>


        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${toneClass.bg}`}
        >
          <Icon
            size={
              21
            }
            className={
              toneClass.icon
            }
          />
        </div>
      </div>


      <div
        className={`absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full ${toneClass.line}`}
      />
    </button>
  );
}


export default function Statistik() {
  const {
    filters,
    updateFilter,
    resetFilters,
    toggleSort,
  } =
    useStatistikFilters();


  const {
    rangeBulan,
    metric,
    sortKey,
    sortDirection,
  } =
    filters;


  const [
    data,
    setData,
  ] =
    useState(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState(
      null
    );


  const [
    generatedAt,
    setGeneratedAt,
  ] =
    useState(
      null
    );


  /* =======================================================
     GENERIC STATISTICS EXPLORER
  ======================================================= */

  const [
    explorer,
    setExplorer,
  ] =
    useState({
      open:
        false,

      title:
        '',

      subtitle:
        '',

      rows:
        [],

      loading:
        false,

      error:
        null,
    });


  /* =======================================================
     LOAD MAIN STATISTICS
  ======================================================= */

  const muat =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );


        const {
          data:
            hasil,

          error:
            rpcError,
        } =
          await supabase.rpc(
            'get_admin_statistics',
            {
              p_jumlah_bulan:
                Number(
                  rangeBulan
                ),
            }
          );


        if (
          rpcError
        ) {
          setError(
            rpcError.message
          );

          setLoading(
            false
          );

          return;
        }


        if (
          hasil?.error
        ) {
          setError(
            hasil.message ??
              'Gagal mengambil statistik administrasi.'
          );

          setLoading(
            false
          );

          return;
        }


        setData(
          hasil
        );


        setGeneratedAt(
          hasil?.generated_at ??
            null
        );


        setLoading(
          false
        );
      },
      [
        rangeBulan,
      ]
    );


  useEffect(
    () => {
      muat();
    },
    [
      muat,
    ]
  );


  const ringkasan =
    data?.ringkasan ??
    {};


  const divisi =
    data?.divisi ??
    [];


  const bulanan =
    data?.bulanan ??
    [];


  const tahunan =
    data?.tahunan ??
    [];


  const instansi =
    data?.instansi ??
    [];


  const penonaktifan =
    data?.penonaktifan ??
    [];


  const tingkatDiterima =
    angka(
      ringkasan.pendaftaran_total
    ) > 0
      ? (
          angka(
            ringkasan.pendaftaran_diterima
          ) /
          angka(
            ringkasan.pendaftaran_total
          )
        ) *
        100
      : 0;


  /* =======================================================
     OPEN GENERIC EXPLORER
  ======================================================= */

  async function bukaExplorer({
    kind,
    title,
    subtitle,

    bulan =
      null,

    tahun =
      'Semua',

    divisi:
      filterDivisi =
        'Semua',

    status =
      'Semua',

    alasan =
      null,

    instansi =
      null,
  }) {
    setExplorer({
      open:
        true,

      title,

      subtitle,

      rows:
        [],

      loading:
        true,

      error:
        null,
    });


    try {
      const rows =
        await loadStatistikDetail({
          kind,
          bulan,
          tahun,

          divisi:
            filterDivisi,

          status,
          alasan,
          instansi,
        });


      setExplorer(
        (
          previous
        ) => ({
          ...previous,

          rows,

          loading:
            false,

          error:
            null,
        })
      );
    } catch (
      err
    ) {
      console.error(
        'Gagal memuat statistics explorer:',
        err
      );


      setExplorer(
        (
          previous
        ) => ({
          ...previous,

          rows:
            [],

          loading:
            false,

          error:
            err?.message ??
              'Gagal memuat detail statistik.',
        })
      );
    }
  }


  function tutupExplorer() {
    setExplorer(
      (
        previous
      ) => ({
        ...previous,

        open:
          false,
      })
    );
  }


  /* =======================================================
     MONTHLY CHART / RECAP DRILL-DOWN
  ======================================================= */

  function bukaBulanDariGrafik(
    item,
    selectedMetric
  ) {
    const bulan =
      item.bulan;


    const periode =
      namaBulanDetail(
        bulan
      );


    const mapping = {
      pendaftar: {
        kind:
          DETAIL_KIND.PENDAFTAR,

        title:
          `Pendaftar — ${periode}`,

        subtitle:
          `${angka(
            item.total_pendaftar
          )} pendaftar tercatat pada ${periode}.`,
      },

      diterima: {
        kind:
          DETAIL_KIND.DITERIMA,

        title:
          `Diterima — ${periode}`,

        subtitle:
          `${angka(
            item.diterima
          )} pengajuan berstatus Approved pada ${periode}.`,
      },

      pending: {
        kind:
          DETAIL_KIND.PENDING,

        title:
          `Pending — ${periode}`,

        subtitle:
          `${angka(
            item.pending
          )} pengajuan masih Pending pada ${periode}.`,
      },

      ditolak: {
        kind:
          DETAIL_KIND.DITOLAK,

        title:
          `Ditolak — ${periode}`,

        subtitle:
          `${angka(
            item.ditolak
          )} pengajuan berstatus Rejected pada ${periode}.`,
      },

      mulai: {
        kind:
          DETAIL_KIND.MULAI_MAGANG,

        title:
          `Mulai Magang — ${periode}`,

        subtitle:
          `${angka(
            item.peserta_mulai
          )} peserta memiliki tanggal mulai magang pada ${periode}.`,
      },

      nonaktif: {
        kind:
          DETAIL_KIND.PENONAKTIFAN,

        title:
          `Penonaktifan — ${periode}`,

        subtitle:
          `${angka(
            item.penonaktifan
          )} riwayat penonaktifan tercatat pada ${periode}.`,
      },
    };


    const config =
      mapping[
        selectedMetric
      ] ??
      mapping.pendaftar;


    bukaExplorer({
      ...config,

      bulan,
    });
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    !data
  ) {
    return (
      <div>
        <div className="skeleton h-8 w-64 rounded-xl" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length:
              8,
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="skeleton h-32 rounded-2xl"
              />
            )
          )}
        </div>

        <div className="mt-6 skeleton h-80 rounded-2xl" />
      </div>
    );
  }


  return (
    <div>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="anim-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Statistik Administrasi
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Rekap pendaftaran,
            peserta magang,
            divisi,
            instansi,
            serta alasan
            penonaktifan.
          </p>

          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
            ✨ Statistik interaktif —
            klik kartu, grafik,
            angka, atau kategori
            untuk eksplorasi
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={
                rangeBulan
              }
              onChange={(
                e
              ) =>
                updateFilter(
                  'rangeBulan',

                  Number(
                    e.target.value
                  )
                )
              }
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-bold text-slate-600 shadow-sm outline-none focus:border-indigo-500"
            >
              <option value={6}>
                6 bulan
              </option>

              <option value={12}>
                12 bulan
              </option>

              <option value={24}>
                24 bulan
              </option>

              <option value={36}>
                36 bulan
              </option>
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>


          <button
            type="button"
            onClick={
              muat
            }
            disabled={
              loading
            }
            className="btn-press flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </div>


      {generatedAt && (
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          Data diperbarui:{' '}

          {tanggalWaktu(
            generatedAt
          )}
        </p>
      )}


      {error && (
        <div className="anim-down mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="text-sm font-bold text-red-700">
              Statistik gagal dimuat
            </p>

            <p className="mt-1 text-xs text-red-600">
              {
                error
              }
            </p>
          </div>
        </div>
      )}


      {!error &&
        data && (
          <>

            {/* =============================================
                SUMMARY PENDAFTARAN
            ============================================= */}

            <section className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3
                    size={18}
                    className="text-indigo-600"
                  />

                  <h2 className="text-base font-bold text-slate-800">
                    Ringkasan Pendaftaran
                  </h2>
                </div>

                <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">
                  Klik kartu untuk drill-down
                </span>
              </div>


              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KartuRingkasan
                  label="Total Pendaftar"
                  value={angka(
                    ringkasan.pendaftaran_total
                  )}
                  detail={`${angka(
                    ringkasan.pendaftaran_tahun_ini
                  )} pendaftar tahun ini`}
                  Icon={
                    Users
                  }
                  tone="indigo"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.PENDAFTAR,

                      title:
                        'Total Pendaftar',

                      subtitle:
                        'Seluruh data pendaftaran yang tercatat di sistem.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Pending"
                  value={angka(
                    ringkasan.pendaftaran_pending
                  )}
                  detail="Menunggu keputusan admin"
                  Icon={
                    Clock3
                  }
                  tone="amber"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.PENDING,

                      title:
                        'Pendaftar Pending',

                      subtitle:
                        'Pengajuan yang masih menunggu keputusan Admin.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Diterima"
                  value={angka(
                    ringkasan.pendaftaran_diterima
                  )}
                  detail={`${persen(
                    tingkatDiterima
                  )} dari seluruh pendaftar`}
                  Icon={
                    CheckCircle2
                  }
                  tone="green"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.DITERIMA,

                      title:
                        'Pendaftar Diterima',

                      subtitle:
                        'Pengajuan yang telah disetujui sebagai peserta magang.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Ditolak"
                  value={angka(
                    ringkasan.pendaftaran_ditolak
                  )}
                  detail="Pengajuan tidak diterima"
                  Icon={
                    CircleX
                  }
                  tone="red"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.DITOLAK,

                      title:
                        'Pendaftar Ditolak',

                      subtitle:
                        'Pengajuan yang telah diproses dengan status Rejected.',
                    })
                  }
                />
              </div>
            </section>


            {/* =============================================
                SUMMARY PESERTA
            ============================================= */}

            <section className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity
                    size={18}
                    className="text-indigo-600"
                  />

                  <h2 className="text-base font-bold text-slate-800">
                    Peserta Magang
                  </h2>
                </div>

                <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">
                  Klik kartu untuk
                  melihat peserta
                </span>
              </div>


              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KartuRingkasan
                  label="Total Peserta"
                  value={angka(
                    ringkasan.peserta_total
                  )}
                  detail="Seluruh peserta yang pernah dibuat"
                  Icon={
                    Users
                  }
                  tone="indigo"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.PESERTA,

                      title:
                        'Seluruh Peserta Magang',

                      subtitle:
                        'Seluruh peserta magang yang tercatat pada sistem.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Aktif"
                  value={angka(
                    ringkasan.peserta_aktif
                  )}
                  detail="Sedang menjalani magang"
                  Icon={
                    Activity
                  }
                  tone="green"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.AKTIF,

                      title:
                        'Peserta Aktif',

                      subtitle:
                        'Peserta yang sedang menjalani periode magang.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Selesai"
                  value={angka(
                    ringkasan.peserta_selesai
                  )}
                  detail={`Rata-rata nilai ${nilai(
                    ringkasan.rata_nilai_final
                  )}`}
                  Icon={
                    CheckCircle2
                  }
                  tone="slate"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.SELESAI,

                      title:
                        'Peserta Selesai',

                      subtitle:
                        'Peserta dengan status magang Completed.',
                    })
                  }
                />


                <KartuRingkasan
                  label="Nonaktif"
                  value={angka(
                    ringkasan.peserta_nonaktif
                  )}
                  detail={`${angka(
                    ringkasan.penonaktifan_total
                  )} riwayat penonaktifan`}
                  Icon={
                    UserMinus
                  }
                  tone="red"
                  onClick={() =>
                    bukaExplorer({
                      kind:
                        DETAIL_KIND.NONAKTIF,

                      title:
                        'Peserta Nonaktif',

                      subtitle:
                        'Peserta dengan status magang Dropped.',
                    })
                  }
                />
              </div>
            </section>


            {/* =============================================
                DIVISION + INSTITUTION
            ============================================= */}

            <DivisionInstitutionAnalytics
              divisions={
                divisi
              }
              institutions={
                instansi
              }
              onOpenDivision={(
                item
              ) =>
                bukaExplorer({
                  kind:
                    DETAIL_KIND.PESERTA,

                  divisi:
                    item.divisi,

                  title:
                    `Peserta — ${item.divisi}`,

                  subtitle:
                    `Seluruh peserta magang yang tercatat pada divisi ${item.divisi}.`,
                })
              }
              onOpenDivisionMetric={(
                item,
                selectedMetric
              ) => {
                const mapping = {
                  pendaftar: {
                    kind:
                      DETAIL_KIND.PENDAFTAR,

                    label:
                      'Pendaftar',
                  },

                  pending: {
                    kind:
                      DETAIL_KIND.PENDING,

                    label:
                      'Pending',
                  },

                  diterima: {
                    kind:
                      DETAIL_KIND.DITERIMA,

                    label:
                      'Diterima',
                  },

                  aktif: {
                    kind:
                      DETAIL_KIND.AKTIF,

                    label:
                      'Peserta Aktif',
                  },

                  selesai: {
                    kind:
                      DETAIL_KIND.SELESAI,

                    label:
                      'Peserta Selesai',
                  },

                  nonaktif: {
                    kind:
                      DETAIL_KIND.NONAKTIF,

                    label:
                      'Peserta Nonaktif',
                  },
                };


                const config =
                  mapping[
                    selectedMetric
                  ];


                if (!config) {
                  return;
                }


                bukaExplorer({
                  kind:
                    config.kind,

                  divisi:
                    item.divisi,

                  title:
                    `${config.label} — ${item.divisi}`,

                  subtitle:
                    `${config.label} pada divisi ${item.divisi}.`,
                });
              }}
              onOpenInstitution={(
                item
              ) =>
                bukaExplorer({
                  kind:
                    DETAIL_KIND.INSTANSI,

                  instansi:
                    item.instansi,

                  title:
                    item.instansi,

                  subtitle:
                    `Seluruh pendaftar yang berasal dari ${item.instansi}.`,
                })
              }
              onOpenInstitutionMetric={(
                item,
                selectedMetric
              ) => {
                const mapping = {
                  peserta: {
                    kind:
                      DETAIL_KIND.PESERTA,

                    label:
                      'Peserta',
                  },

                  diterima: {
                    kind:
                      DETAIL_KIND.DITERIMA,

                    label:
                      'Diterima',
                  },

                  pending: {
                    kind:
                      DETAIL_KIND.PENDING,

                    label:
                      'Pending',
                  },

                  ditolak: {
                    kind:
                      DETAIL_KIND.DITOLAK,

                    label:
                      'Ditolak',
                  },
                };


                const config =
                  mapping[
                    selectedMetric
                  ];


                if (!config) {
                  return;
                }


                bukaExplorer({
                  kind:
                    config.kind,

                  instansi:
                    item.instansi,

                  title:
                    `${config.label} — ${item.instansi}`,

                  subtitle:
                    `${config.label} yang berasal dari ${item.instansi}.`,
                });
              }}
            />


            {/* =============================================
                MODERN MONTHLY CHART
            ============================================= */}

            <div className="mt-8">
              <MonthlyRegistrationChart
                data={
                  bulanan
                }
                metric={
                  metric
                }
                onMetricChange={(
                  nextMetric
                ) =>
                  updateFilter(
                    'metric',
                    nextMetric
                  )
                }
                onMonthClick={
                  bukaBulanDariGrafik
                }
              />
            </div>


            {/* =============================================
                INTERACTIVE MONTHLY RECAP
            ============================================= */}

            <div className="mt-6">
              <MonthlyRecapTable
                data={
                  bulanan
                }
                filters={
                  filters
                }
                updateFilter={
                  updateFilter
                }
                resetFilters={
                  resetFilters
                }
                sortKey={
                  sortKey
                }
                sortDirection={
                  sortDirection
                }
                onSort={
                  toggleSort
                }
                onMetricClick={
                  bukaBulanDariGrafik
                }
                onDivisionClick={(
                  item,
                  division
                ) =>
                  bukaExplorer({
                    kind:
                      DETAIL_KIND.PENDAFTAR,

                    bulan:
                      item.bulan,

                    divisi:
                      division,

                    title:
                      `${division} — ${namaBulanDetail(
                        item.bulan
                      )}`,

                    subtitle:
                      `Pendaftar divisi ${division} pada ${namaBulanDetail(
                        item.bulan
                      )}.`,
                  })
                }
              />
            </div>


            {/* =============================================
                FASE 5-8F
                YEARLY + SUSPENSION UNIFIED
            ============================================= */}

            <YearlySuspensionAnalytics
              yearly={
                tahunan
              }
              suspensions={
                penonaktifan
              }
              onOpenYear={(
                item
              ) =>
                bukaExplorer({
                  kind:
                    DETAIL_KIND.PENDAFTAR,

                  tahun:
                    String(
                      item.tahun
                    ),

                  title:
                    `Pendaftar — ${item.tahun}`,

                  subtitle:
                    `${angka(
                      item.total_pendaftar
                    )} pendaftar tercatat pada tahun ${item.tahun}.`,
                })
              }
              onOpenYearMetric={(
                item,
                selectedMetric
              ) => {
                const mapping = {
                  pendaftar: {
                    kind:
                      DETAIL_KIND.PENDAFTAR,

                    label:
                      'Pendaftar',

                    value:
                      item.total_pendaftar,
                  },

                  diterima: {
                    kind:
                      DETAIL_KIND.DITERIMA,

                    label:
                      'Diterima',

                    value:
                      item.diterima,
                  },

                  pending: {
                    kind:
                      DETAIL_KIND.PENDING,

                    label:
                      'Pending',

                    value:
                      item.pending,
                  },

                  ditolak: {
                    kind:
                      DETAIL_KIND.DITOLAK,

                    label:
                      'Ditolak',

                    value:
                      item.ditolak,
                  },
                };


                const config =
                  mapping[
                    selectedMetric
                  ];


                if (!config) {
                  return;
                }


                bukaExplorer({
                  kind:
                    config.kind,

                  tahun:
                    String(
                      item.tahun
                    ),

                  title:
                    `${config.label} — ${item.tahun}`,

                  subtitle:
                    `${angka(
                      config.value
                    )} data ${config.label.toLowerCase()} tercatat pada tahun ${item.tahun}.`,
                });
              }}
              onOpenSuspension={(
                item
              ) =>
                bukaExplorer({
                  kind:
                    DETAIL_KIND.PENONAKTIFAN,

                  alasan:
                    item.alasan,

                  title:
                    `Penonaktifan — ${item.alasan}`,

                  subtitle:
                    `${angka(
                      item.jumlah
                    )} riwayat penonaktifan dengan alasan “${item.alasan}”.`,
                })
              }
            />


            {/* =============================================
                DUMMY DATA REMINDER
            ============================================= */}

            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs leading-relaxed text-amber-700">
                💡 Statistik saat ini
                juga menghitung data
                dummy yang ada di
                database. Sebelum
                sistem resmi
                diluncurkan, data
                dummy tersebut
                sebaiknya dibersihkan.
              </p>
            </div>
          </>
        )}


      {/* =================================================
          ONE GENERIC EXPLORER FOR ALL STATISTICS
      ================================================= */}

      <StatistikDetailModal
        open={
          explorer.open
        }
        onClose={
          tutupExplorer
        }
        title={
          explorer.title
        }
        subtitle={
          explorer.subtitle
        }
        rows={
          explorer.rows
        }
        loading={
          explorer.loading
        }
        error={
          explorer.error
        }
      />
    </div>
  );
}