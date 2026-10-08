import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import * as XLSX from 'xlsx';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
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
import JurusanAnalytics from '../../components/JurusanAnalytics';
import GlobalStatisticsFilter from '../../components/GlobalStatisticsFilter';
import ScrollReveal from '../../components/ScrollReveal';

import {
  useStatistikFilters,
} from '../../hooks/useStatistikFilters';

import {
  DETAIL_KIND,
  loadStatistikDetail,
  namaBulanDetail,
} from '../../lib/statisticsExplorer';


/* =========================================================
   EXCEL EXPORT HELPERS — FASE 5-9E.3
========================================================= */

function excelSafe(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }

  return value;
}


function waktuExportWib() {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      timeZone:
        'Asia/Jakarta',

      dateStyle:
        'full',

      timeStyle:
        'medium',
    }
  ).format(
    new Date()
  );
}


function tanggalNamaFile() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Jakarta',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  )
    .format(
      new Date()
    )
    .replaceAll(
      '-',
      ''
    );
}


function buatSheet(
  rows,
  widths = []
) {
  const isi =
    Array.isArray(
      rows
    ) &&
    rows.length > 0
      ? rows
      : [
          {
            Informasi:
              'Tidak ada data untuk filter aktif.',
          },
        ];


  const worksheet =
    XLSX.utils.json_to_sheet(
      isi
    );


  if (
    widths.length >
    0
  ) {
    worksheet[
      '!cols'
    ] =
      widths.map(
        (
          width
        ) => ({
          wch:
            width,
        })
      );
  }


  if (
    worksheet[
      '!ref'
    ] &&
    Array.isArray(
      rows
    ) &&
    rows.length >
      0
  ) {
    worksheet[
      '!autofilter'
    ] = {
      ref:
        worksheet[
          '!ref'
        ],
    };
  }


  return worksheet;
}


function labelFilter(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'Semua'
  ) {
    return 'Semua';
  }


  return String(
    value
  );
}


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
   COUNT UP
========================================================= */

function CountUp({
  value,
}) {
  const target =
    angka(
      value
    );


  const [
    display,
    setDisplay,
  ] =
    useState(
      0
    );


  useEffect(
    () => {
      const reduced =
        window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        )?.matches;


      if (
        reduced
      ) {
        setDisplay(
          target
        );

        return undefined;
      }


      let frame;


      const start =
        performance.now();


      const duration =
        650;


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


        const eased =
          1 -
          Math.pow(
            1 -
              progress,
            3
          );


        setDisplay(
          Math.round(
            target *
            eased
          )
        );


        if (
          progress <
          1
        ) {
          frame =
            requestAnimationFrame(
              animate
            );
        }
      };


      frame =
        requestAnimationFrame(
          animate
        );


      return () =>
        cancelAnimationFrame(
          frame
        );
    },
    [
      target,
    ]
  );


  return display;
}


/* =========================================================
   SUMMARY CARD
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
      className={`group relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.99] ${toneClass.hover}`}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>


          <p
            className={`mt-2 text-3xl font-extrabold tabular-nums ${toneClass.value}`}
          >
            <CountUp
              value={
                value
              }
            />
          </p>


          {detail && (
            <p className="mt-1 text-xs text-slate-400">
              {detail}
            </p>
          )}


          <div
            className={`mt-3 flex items-center gap-1 text-[10px] font-bold ${toneClass.detail}`}
          >
            Lihat detail

            <ChevronRight
              size={13}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </div>

        </div>


        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110 ${toneClass.bg}`}
        >
          <Icon
            size={21}
            className={
              toneClass.icon
            }
          />
        </div>

      </div>


      <div
        className={`absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full ${toneClass.line}`}
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
    activeFilterCount,
  } =
    useStatistikFilters();


  const {
    metric,
    sortKey,
    sortDirection,
  } =
    filters;


  const [
    pageReady,
    setPageReady,
  ] =
    useState(
      false
    );


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


  const [
    exportBusy,
    setExportBusy,
  ] =
    useState(
      false
    );


  const [
    exportMessage,
    setExportMessage,
  ] =
    useState(
      null
    );


  const [
    yearOptions,
    setYearOptions,
  ] =
    useState(
      []
    );


  const [
    jurusanOptions,
    setJurusanOptions,
  ] =
    useState(
      []
    );


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
     PAGE ENTRANCE
  ======================================================= */

  useEffect(
    () => {
      const reduced =
        window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        )?.matches;


      if (
        reduced
      ) {
        setPageReady(
          true
        );

        return;
      }


      const frame =
        requestAnimationFrame(
          () => {
            setPageReady(
              true
            );
          }
        );


      return () =>
        cancelAnimationFrame(
          frame
        );
    },
    []
  );


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const muatFilterOptions =
    useCallback(
      async () => {
        try {
          const [
            statisticsResult,
            jurusanResult,
          ] =
            await Promise.all([
              supabase.rpc(
                'get_admin_statistics',
                {
                  p_jumlah_bulan:
                    36,
                }
              ),

              supabase.rpc(
                'get_admin_jurusan_statistics'
              ),
            ]);


          if (
            !statisticsResult.error
          ) {
            setYearOptions(
              Array.from(
                new Set(
                  (
                    statisticsResult
                      .data
                      ?.tahunan ??
                    []
                  )
                    .map(
                      (
                        item
                      ) =>
                        Number(
                          item.tahun
                        )
                    )
                    .filter(
                      Number.isFinite
                    )
                )
              ).sort(
                (
                  a,
                  b
                ) =>
                  b -
                  a
              )
            );
          }


          if (
            !jurusanResult.error
          ) {
            setJurusanOptions(
              Array.from(
                new Set(
                  (
                    jurusanResult
                      .data
                      ?.jurusan ??
                    []
                  )
                    .map(
                      (
                        item
                      ) =>
                        item.jurusan
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
                  String(
                    a
                  ).localeCompare(
                    String(
                      b
                    ),
                    'id-ID'
                  )
              )
            );
          }

        } catch (
          err
        ) {
          console.error(
            'Gagal memuat pilihan filter:',
            err
          );
        }
      },
      []
    );


  useEffect(
    () => {
      muatFilterOptions();
    },
    [
      muatFilterOptions,
    ]
  );


  /* =======================================================
     LOAD
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


        try {
          const {
            data:
              hasil,

            error:
              rpcError,
          } =
            await supabase.rpc(
              'get_admin_statistics_filtered',
              {
                p_jumlah_bulan:
                  Number(
                    filters.rangeBulan
                  ),

                p_tahun:
                  filters.tahun ===
                  'Semua'
                    ? null
                    : Number(
                        filters.tahun
                      ),

                p_bulan:
                  filters.bulan ===
                  'Semua'
                    ? null
                    : Number(
                        filters.bulan
                      ),

                p_divisi:
                  filters.divisi ===
                  'Semua'
                    ? null
                    : filters.divisi,

                p_jurusan:
                  filters.jurusan ===
                  'Semua'
                    ? null
                    : filters.jurusan,

                p_status_pendaftaran:
                  filters.status ===
                  'Semua'
                    ? null
                    : filters.status,

                p_status_magang:
                  filters.statusMagang ===
                  'Semua'
                    ? null
                    : filters.statusMagang,
              }
            );


          if (
            rpcError
          ) {
            throw rpcError;
          }


          if (
            hasil?.error
          ) {
            throw new Error(
              hasil.message ??
              'Gagal mengambil statistik.'
            );
          }


          setData(
            hasil
          );


          setGeneratedAt(
            hasil.generated_at ??
            null
          );


        } catch (
          err
        ) {
          setError(
            err?.message ??
            'Gagal mengambil statistik.'
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      [
        filters.rangeBulan,
        filters.tahun,
        filters.bulan,
        filters.divisi,
        filters.jurusan,
        filters.status,
        filters.statusMagang,
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


  const jurusanData =
    data?.jurusan ??
    [];


  const jurusanSummary =
    data?.jurusan_ringkasan ??
    {};


  const penonaktifan =
    data?.penonaktifan ??
    [];


  const tingkatDiterima =
    angka(
      ringkasan
        .pendaftaran_total
    ) >
    0
      ? (
          angka(
            ringkasan
              .pendaftaran_diterima
          ) /
          angka(
            ringkasan
              .pendaftaran_total
          )
        ) *
        100
      : 0;


  /* =======================================================
     FASE 5-9E.3 — EXPORT STATISTIK EXCEL
  ======================================================= */

  function handleExportStatistik() {
    if (
      !data ||
      exportBusy
    ) {
      return;
    }


    setExportBusy(
      true
    );


    setExportMessage(
      null
    );


    try {
      const ringkasanRows = [
        {
          Statistik:
            'Total Pendaftar',

          Nilai:
            angka(
              ringkasan
                .pendaftaran_total
            ),
        },

        {
          Statistik:
            'Pendaftar Tahun Ini',

          Nilai:
            angka(
              ringkasan
                .pendaftaran_tahun_ini
            ),
        },

        {
          Statistik:
            'Pending',

          Nilai:
            angka(
              ringkasan
                .pendaftaran_pending
            ),
        },

        {
          Statistik:
            'Diterima',

          Nilai:
            angka(
              ringkasan
                .pendaftaran_diterima
            ),
        },

        {
          Statistik:
            'Ditolak',

          Nilai:
            angka(
              ringkasan
                .pendaftaran_ditolak
            ),
        },

        {
          Statistik:
            'Tingkat Diterima',

          Nilai:
            persen(
              tingkatDiterima
            ),
        },

        {
          Statistik:
            'Total Peserta',

          Nilai:
            angka(
              ringkasan
                .peserta_total
            ),
        },

        {
          Statistik:
            'Peserta Aktif',

          Nilai:
            angka(
              ringkasan
                .peserta_aktif
            ),
        },

        {
          Statistik:
            'Peserta Selesai',

          Nilai:
            angka(
              ringkasan
                .peserta_selesai
            ),
        },

        {
          Statistik:
            'Peserta Nonaktif',

          Nilai:
            angka(
              ringkasan
                .peserta_nonaktif
            ),
        },

        {
          Statistik:
            'Rata-rata Nilai Final',

          Nilai:
            nilai(
              ringkasan
                .rata_nilai_final
            ),
        },

        {
          Statistik:
            'Total Riwayat Penonaktifan',

          Nilai:
            angka(
              ringkasan
                .penonaktifan_total
            ),
        },
      ];


      const divisiRows =
        divisi.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            Divisi:
              excelSafe(
                item.divisi
              ),

            'Total Pendaftar':
              angka(
                item.total_pendaftar
              ),

            Pending:
              angka(
                item.pending
              ),

            Diterima:
              angka(
                item.diterima
              ),

            Ditolak:
              angka(
                item.ditolak
              ),

            'Total Peserta':
              angka(
                item.total_peserta ??
                item.total
              ),

            'Peserta Aktif':
              angka(
                item.peserta_aktif ??
                item.aktif
              ),

            'Peserta Selesai':
              angka(
                item.peserta_selesai ??
                item.selesai
              ),

            'Peserta Nonaktif':
              angka(
                item.peserta_nonaktif ??
                item.nonaktif
              ),
          })
        );


      const instansiRows =
        instansi.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            Instansi:
              excelSafe(
                item.instansi
              ),

            'Total Pendaftar':
              angka(
                item.total_pendaftar
              ),

            Pending:
              angka(
                item.pending
              ),

            Diterima:
              angka(
                item.diterima
              ),

            Ditolak:
              angka(
                item.ditolak
              ),

            'Total Peserta':
              angka(
                item.total_peserta ??
                item.peserta
              ),

            'Peserta Aktif':
              angka(
                item.peserta_aktif ??
                item.aktif
              ),

            'Peserta Selesai':
              angka(
                item.peserta_selesai ??
                item.selesai
              ),

            'Peserta Nonaktif':
              angka(
                item.peserta_nonaktif ??
                item.nonaktif
              ),
          })
        );


      const jurusanRows =
        jurusanData.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            'Jurusan / Program Studi':
              excelSafe(
                item.jurusan
              ),

            'Total Pendaftar':
              angka(
                item.total_pendaftar
              ),

            Pending:
              angka(
                item.pending
              ),

            Diterima:
              angka(
                item.diterima
              ),

            Ditolak:
              angka(
                item.ditolak
              ),

            'Total Peserta':
              angka(
                item.total_peserta ??
                item.peserta
              ),

            'Peserta Aktif':
              angka(
                item.peserta_aktif ??
                item.aktif
              ),

            'Peserta Selesai':
              angka(
                item.peserta_selesai ??
                item.selesai
              ),

            'Peserta Nonaktif':
              angka(
                item.peserta_nonaktif ??
                item.nonaktif
              ),
          })
        );


      const jurusanSummaryRows =
        Object.entries(
          jurusanSummary ??
          {}
        ).map(
          (
            [
              key,
              value,
            ]
          ) => ({
            Statistik:
              key,

            Nilai:
              typeof value ===
              'object'
                ? JSON.stringify(
                    value
                  )
                : excelSafe(
                    value
                  ),
          })
        );


      const bulananRows =
        bulanan.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            Bulan:
              namaBulanDetail(
                item.bulan
              ),

            'Kode Bulan':
              excelSafe(
                item.bulan
              ),

            'Total Pendaftar':
              angka(
                item.total_pendaftar
              ),

            Diterima:
              angka(
                item.diterima
              ),

            Pending:
              angka(
                item.pending
              ),

            Ditolak:
              angka(
                item.ditolak
              ),

            'Peserta Mulai Magang':
              angka(
                item.peserta_mulai
              ),

            Penonaktifan:
              angka(
                item.penonaktifan
              ),

            'Divisi Admin':
              angka(
                item.div_admin
              ),

            'Divisi Sosmed':
              angka(
                item.div_sosmed
              ),

            'Divisi Marketplace':
              angka(
                item.div_marketplace
              ),

            'Divisi Web Developer':
              angka(
                item.div_webdev
              ),
          })
        );


      const tahunanRows =
        tahunan.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            Tahun:
              excelSafe(
                item.tahun
              ),

            'Total Pendaftar':
              angka(
                item.total_pendaftar
              ),

            Diterima:
              angka(
                item.diterima
              ),

            Pending:
              angka(
                item.pending
              ),

            Ditolak:
              angka(
                item.ditolak
              ),

            'Peserta Mulai':
              angka(
                item.peserta_mulai
              ),

            Penonaktifan:
              angka(
                item.penonaktifan
              ),
          })
        );


      const penonaktifanRows =
        penonaktifan.map(
          (
            item,
            index
          ) => ({
            No:
              index +
              1,

            Alasan:
              excelSafe(
                item.alasan
              ),

            Jumlah:
              angka(
                item.jumlah
              ),
          })
        );


      const infoRows = [
        {
          Keterangan:
            'Nama Laporan',

          Nilai:
            'Statistik Administrasi Creativemu Academy',
        },

        {
          Keterangan:
            'Waktu Export',

          Nilai:
            waktuExportWib(),
        },

        {
          Keterangan:
            'Data Statistik Dibangkitkan',

          Nilai:
            generatedAt
              ? tanggalWaktu(
                  generatedAt
                )
              : '-',
        },

        {
          Keterangan:
            'Rentang Bulan',

          Nilai:
            `${labelFilter(
              filters
                .rangeBulan
            )} bulan`,
        },

        {
          Keterangan:
            'Tahun',

          Nilai:
            labelFilter(
              filters.tahun
            ),
        },

        {
          Keterangan:
            'Bulan',

          Nilai:
            labelFilter(
              filters.bulan
            ),
        },

        {
          Keterangan:
            'Divisi',

          Nilai:
            labelFilter(
              filters.divisi
            ),
        },

        {
          Keterangan:
            'Jurusan / Program Studi',

          Nilai:
            labelFilter(
              filters.jurusan
            ),
        },

        {
          Keterangan:
            'Status Pendaftaran',

          Nilai:
            labelFilter(
              filters.status
            ),
        },

        {
          Keterangan:
            'Status Magang',

          Nilai:
            labelFilter(
              filters.statusMagang
            ),
        },

        {
          Keterangan:
            'Metric Grafik',

          Nilai:
            labelFilter(
              metric
            ),
        },

        {
          Keterangan:
            'Sorting Rekap Bulanan',

          Nilai:
            `${labelFilter(
              sortKey
            )} (${labelFilter(
              sortDirection
            )})`,
        },

        {
          Keterangan:
            'Jumlah Global Filter Aktif',

          Nilai:
            angka(
              activeFilterCount
            ),
        },

        {
          Keterangan:
            'Catatan',

          Nilai:
            'Export menggunakan dataset statistik yang sama dengan Global Filter aktif pada halaman Statistik Administrasi.',
        },
      ];


      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          ringkasanRows,
          [
            34,
            24,
          ]
        ),
        'Ringkasan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          divisiRows,
          [
            6,
            24,
            18,
            14,
            14,
            14,
            18,
            18,
            18,
            20,
          ]
        ),
        'Per Divisi'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          instansiRows,
          [
            6,
            45,
            18,
            14,
            14,
            14,
            18,
            18,
            18,
            20,
          ]
        ),
        'Per Instansi'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          jurusanRows,
          [
            6,
            42,
            18,
            14,
            14,
            14,
            18,
            18,
            18,
            20,
          ]
        ),
        'Per Jurusan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          jurusanSummaryRows,
          [
            36,
            60,
          ]
        ),
        'Ringkasan Jurusan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          bulananRows,
          [
            6,
            24,
            14,
            18,
            14,
            14,
            14,
            22,
            18,
            16,
            16,
            20,
            24,
          ]
        ),
        'Rekap Bulanan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          tahunanRows,
          [
            6,
            12,
            18,
            14,
            14,
            14,
            18,
            18,
          ]
        ),
        'Rekap Tahunan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          penonaktifanRows,
          [
            6,
            60,
            14,
          ]
        ),
        'Penonaktifan'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        buatSheet(
          infoRows,
          [
            34,
            88,
          ]
        ),
        'Informasi Export'
      );


      const filename =
        `Statistik_Creativemu_${filters.rangeBulan}_Bulan_${tanggalNamaFile()}.xlsx`;


      XLSX.writeFile(
        workbook,
        filename,
        {
          compression:
            true,
        }
      );


      setExportMessage({
        tipe:
          'ok',

        teks:
          `✅ Statistik berhasil diekspor ke Excel — ${filters.rangeBulan} bulan, ${activeFilterCount} Global Filter aktif.`,
      });

    } catch (
      err
    ) {
      console.error(
        'Export statistik gagal:',
        err
      );


      setExportMessage({
        tipe:
          'err',

        teks:
          err?.message ??
          'Export statistik gagal.',
      });

    } finally {
      setExportBusy(
        false
      );
    }
  }


  function globalDetailFilter() {
    return {
      tahun:
        filters.tahun,

      bulanNomor:
        filters.bulan,

      divisi:
        filters.divisi,

      jurusan:
        filters.jurusan,

      statusPendaftaran:
        filters.status,

      statusMagang:
        filters.statusMagang,
    };
  }


  async function bukaExplorer({
    kind,
    title,
    subtitle,
    bulan = null,
    tahun,
    bulanNomor,
    divisi: overrideDivisi,
    jurusan: overrideJurusan,
    statusPendaftaran,
    statusMagang,
    alasan = null,
    instansi = null,
  }) {
    const global =
      globalDetailFilter();


    const exactMonth =
      Boolean(
        bulan &&
        /^\d{4}-\d{2}$/.test(
          bulan
        )
      );


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

          bulan:
            exactMonth
              ? bulan
              : null,

          tahun:
            exactMonth
              ? 'Semua'
              : (
                  tahun ??
                  global.tahun
                ),

          bulanNomor:
            exactMonth
              ? 'Semua'
              : (
                  bulanNomor ??
                  global.bulanNomor
                ),

          divisi:
            overrideDivisi ??
            global.divisi,

          jurusan:
            overrideJurusan ??
            global.jurusan,

          statusPendaftaran:
            statusPendaftaran ??
            global.statusPendaftaran,

          statusMagang:
            statusMagang ??
            global.statusMagang,

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


  function bukaBulanDariGrafik(
    item,
    selectedMetric
  ) {
    const periode =
      namaBulanDetail(
        item.bulan
      );


    const mapping = {
      pendaftar: [
        DETAIL_KIND.PENDAFTAR,
        'Pendaftar',
        item.total_pendaftar,
      ],

      diterima: [
        DETAIL_KIND.DITERIMA,
        'Diterima',
        item.diterima,
      ],

      pending: [
        DETAIL_KIND.PENDING,
        'Pending',
        item.pending,
      ],

      ditolak: [
        DETAIL_KIND.DITOLAK,
        'Ditolak',
        item.ditolak,
      ],

      mulai: [
        DETAIL_KIND.MULAI_MAGANG,
        'Mulai Magang',
        item.peserta_mulai,
      ],

      nonaktif: [
        DETAIL_KIND.PENONAKTIFAN,
        'Penonaktifan',
        item.penonaktifan,
      ],
    };


    const config =
      mapping[
        selectedMetric
      ] ??
      mapping.pendaftar;


    bukaExplorer({
      kind:
        config[
          0
        ],

      bulan:
        item.bulan,

      title:
        `${config[1]} — ${periode}`,

      subtitle:
        `${angka(
          config[
            2
          ]
        )} data sesuai Filter Statistik aktif.`,
    });
  }


  function bukaJurusan(
    item
  ) {
    bukaExplorer({
      kind:
        DETAIL_KIND.JURUSAN,

      jurusan:
        item.jurusan,

      title:
        `Peserta — ${item.jurusan}`,

      subtitle:
        'Data mengikuti Filter Statistik aktif.',
    });
  }


  function bukaMetricJurusan(
    item,
    selectedMetric
  ) {
    const mapping = {
      pendaftar: [
        DETAIL_KIND.PENDAFTAR,
        'Pendaftar',
      ],

      pending: [
        DETAIL_KIND.PENDING,
        'Pending',
      ],

      diterima: [
        DETAIL_KIND.DITERIMA,
        'Diterima',
      ],

      ditolak: [
        DETAIL_KIND.DITOLAK,
        'Ditolak',
      ],

      peserta: [
        DETAIL_KIND.PESERTA,
        'Peserta',
      ],

      aktif: [
        DETAIL_KIND.AKTIF,
        'Peserta Aktif',
      ],

      selesai: [
        DETAIL_KIND.SELESAI,
        'Peserta Selesai',
      ],

      nonaktif: [
        DETAIL_KIND.NONAKTIF,
        'Peserta Nonaktif',
      ],
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
        config[
          0
        ],

      jurusan:
        item.jurusan,

      title:
        `${config[1]} — ${item.jurusan}`,

      subtitle:
        'Data mengikuti Filter Statistik aktif.',
    });
  }


  if (
    loading &&
    !data
  ) {
    return (
      <div>

        <div className="skeleton h-8 w-64 rounded-xl" />

        <div className="mt-6 skeleton h-52 rounded-3xl" />

        <div className="mt-6 skeleton h-96 rounded-3xl" />

      </div>
    );
  }


  return (
    <div
      className="transition-[opacity,transform] duration-300 ease-out"
      style={{
        opacity:
          pageReady
            ? 1
            : 0,

        transform:
          pageReady
            ? 'translate3d(0,0,0)'
            : 'translate3d(0,8px,0)',
      }}
    >

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Statistik Administrasi
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Rekap pendaftaran,
            peserta magang,
            divisi,
            jurusan,
            instansi,
            serta alasan
            penonaktifan.
          </p>

          <p className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
            ✨ Semua statistik mengikuti Global Filter
          </p>

        </div>


        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={
              handleExportStatistik
            }
            disabled={
              exportBusy ||
              loading ||
              !data
            }
            className="btn-press inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {exportBusy ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                Mengekspor…
              </>
            ) : (
              <>
                📊 Export Statistik
              </>
            )}

          </button>


          <button
            type="button"
            onClick={
              muat
            }
            disabled={
              loading
            }
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >

            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : 'transition-transform duration-500 group-hover:rotate-180'
              }
            />

            Refresh

          </button>

        </div>

      </div>


      {generatedAt && (
        <p className="mt-2 text-[10px] text-slate-400">
          Data diperbarui:{' '}
          {tanggalWaktu(
            generatedAt
          )}
        </p>
      )}


      {exportMessage && (
        <p
          className={`anim-down mt-3 rounded-xl p-3 text-xs font-semibold ${
            exportMessage.tipe ===
            'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {exportMessage.teks}
        </p>
      )}


      <ScrollReveal
        delay={
          80
        }
      >

        <GlobalStatisticsFilter
          filters={
            filters
          }
          updateFilter={
            updateFilter
          }
          resetFilters={
            resetFilters
          }
          activeFilterCount={
            activeFilterCount
          }
          years={
            yearOptions
          }
          jurusanOptions={
            jurusanOptions
          }
          loading={
            loading
          }
        />

      </ScrollReveal>


      {error && (
        <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

          <AlertTriangle
            size={20}
            className="text-red-600"
          />

          <div>

            <p className="text-sm font-bold text-red-700">
              Statistik gagal dimuat
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>

          </div>

        </div>
      )}


      {!error &&
        data && (
          <>

            {/* RINGKASAN PENDAFTARAN */}

            <ScrollReveal>

              <section className="mt-7">

                <div className="flex items-center gap-2">

                  <BarChart3
                    size={18}
                    className="text-indigo-600"
                  />

                  <h2 className="font-bold text-slate-800">
                    Ringkasan Pendaftaran
                  </h2>

                </div>


                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

                  {[
                    {
                      label:
                        'Total Pendaftar',

                      value:
                        ringkasan
                          .pendaftaran_total,

                      detail:
                        'Sesuai filter aktif',

                      Icon:
                        Users,

                      tone:
                        'indigo',

                      kind:
                        DETAIL_KIND.PENDAFTAR,

                      title:
                        'Total Pendaftar',
                    },

                    {
                      label:
                        'Pending',

                      value:
                        ringkasan
                          .pendaftaran_pending,

                      detail:
                        'Status Pending',

                      Icon:
                        Clock3,

                      tone:
                        'amber',

                      kind:
                        DETAIL_KIND.PENDING,

                      title:
                        'Pendaftar Pending',
                    },

                    {
                      label:
                        'Diterima',

                      value:
                        ringkasan
                          .pendaftaran_diterima,

                      detail:
                        `${persen(
                          tingkatDiterima
                        )} dari data terfilter`,

                      Icon:
                        CheckCircle2,

                      tone:
                        'green',

                      kind:
                        DETAIL_KIND.DITERIMA,

                      title:
                        'Pendaftar Diterima',
                    },

                    {
                      label:
                        'Ditolak',

                      value:
                        ringkasan
                          .pendaftaran_ditolak,

                      detail:
                        'Status Rejected',

                      Icon:
                        CircleX,

                      tone:
                        'red',

                      kind:
                        DETAIL_KIND.DITOLAK,

                      title:
                        'Pendaftar Ditolak',
                    },
                  ].map(
                    (
                      item,
                      index
                    ) => (

                      <ScrollReveal
                        key={
                          item.label
                        }
                        delay={
                          index *
                          90
                        }
                        distance={
                          16
                        }
                      >

                        <KartuRingkasan
                          {...item}
                          onClick={() =>
                            bukaExplorer({
                              kind:
                                item.kind,

                              title:
                                item.title,

                              subtitle:
                                'Data mengikuti Filter Statistik aktif.',
                            })
                          }
                        />

                      </ScrollReveal>
                    )
                  )}

                </div>

              </section>

            </ScrollReveal>


            {/* PESERTA */}

            <ScrollReveal>

              <section className="mt-7">

                <div className="flex items-center gap-2">

                  <Activity
                    size={18}
                    className="text-indigo-600"
                  />

                  <h2 className="font-bold text-slate-800">
                    Peserta Magang
                  </h2>

                </div>


                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

                  {[
                    {
                      label:
                        'Total Peserta',

                      value:
                        ringkasan
                          .peserta_total,

                      detail:
                        'Sesuai filter aktif',

                      Icon:
                        Users,

                      tone:
                        'indigo',

                      kind:
                        DETAIL_KIND.PESERTA,
                    },

                    {
                      label:
                        'Aktif',

                      value:
                        ringkasan
                          .peserta_aktif,

                      detail:
                        'Status Active',

                      Icon:
                        Activity,

                      tone:
                        'green',

                      kind:
                        DETAIL_KIND.AKTIF,
                    },

                    {
                      label:
                        'Selesai',

                      value:
                        ringkasan
                          .peserta_selesai,

                      detail:
                        `Rata-rata nilai ${nilai(
                          ringkasan
                            .rata_nilai_final
                        )}`,

                      Icon:
                        CheckCircle2,

                      tone:
                        'slate',

                      kind:
                        DETAIL_KIND.SELESAI,
                    },

                    {
                      label:
                        'Nonaktif',

                      value:
                        ringkasan
                          .peserta_nonaktif,

                      detail:
                        `${angka(
                          ringkasan
                            .penonaktifan_total
                        )} riwayat penonaktifan`,

                      Icon:
                        UserMinus,

                      tone:
                        'red',

                      kind:
                        DETAIL_KIND.NONAKTIF,
                    },
                  ].map(
                    (
                      item,
                      index
                    ) => (

                      <ScrollReveal
                        key={
                          item.label
                        }
                        delay={
                          index *
                          90
                        }
                      >

                        <KartuRingkasan
                          {...item}
                          onClick={() =>
                            bukaExplorer({
                              kind:
                                item.kind,

                              title:
                                item.label,

                              subtitle:
                                'Data mengikuti Filter Statistik aktif.',
                            })
                          }
                        />

                      </ScrollReveal>
                    )
                  )}

                </div>

              </section>

            </ScrollReveal>


            {/* DIVISI + INSTANSI */}

            <ScrollReveal
              distance={
                34
              }
            >

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
                      'Data mengikuti Filter Statistik aktif.',
                  })
                }
                onOpenDivisionMetric={(
                  item,
                  selectedMetric
                ) => {

                  const mapping = {
                    pendaftar: [
                      DETAIL_KIND.PENDAFTAR,
                      'Pendaftar',
                    ],

                    pending: [
                      DETAIL_KIND.PENDING,
                      'Pending',
                    ],

                    diterima: [
                      DETAIL_KIND.DITERIMA,
                      'Diterima',
                    ],

                    aktif: [
                      DETAIL_KIND.AKTIF,
                      'Peserta Aktif',
                    ],

                    selesai: [
                      DETAIL_KIND.SELESAI,
                      'Peserta Selesai',
                    ],

                    nonaktif: [
                      DETAIL_KIND.NONAKTIF,
                      'Peserta Nonaktif',
                    ],
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
                      config[
                        0
                      ],

                    divisi:
                      item.divisi,

                    title:
                      `${config[1]} — ${item.divisi}`,

                    subtitle:
                      'Data mengikuti Filter Statistik aktif.',
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
                      'Data mengikuti Filter Statistik aktif.',
                  })
                }
                onOpenInstitutionMetric={(
                  item,
                  selectedMetric
                ) => {

                  const mapping = {
                    peserta: [
                      DETAIL_KIND.PESERTA,
                      'Peserta',
                    ],

                    diterima: [
                      DETAIL_KIND.DITERIMA,
                      'Diterima',
                    ],

                    pending: [
                      DETAIL_KIND.PENDING,
                      'Pending',
                    ],

                    ditolak: [
                      DETAIL_KIND.DITOLAK,
                      'Ditolak',
                    ],
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
                      config[
                        0
                      ],

                    instansi:
                      item.instansi,

                    title:
                      `${config[1]} — ${item.instansi}`,

                    subtitle:
                      'Data mengikuti Filter Statistik aktif.',
                  });
                }}
              />

            </ScrollReveal>


            {/* JURUSAN */}

            <JurusanAnalytics
              data={
                jurusanData
              }
              summary={
                jurusanSummary
              }
              loading={
                false
              }
              error={
                null
              }
              onOpenJurusan={
                bukaJurusan
              }
              onOpenMetric={
                bukaMetricJurusan
              }
            />


            {/* GRAFIK BULANAN */}

            <ScrollReveal
              distance={
                36
              }
            >

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

            </ScrollReveal>


            {/* REKAP BULANAN */}

            <ScrollReveal
              distance={
                36
              }
            >

              <div className="mt-6">

                <MonthlyRecapTable
                  data={
                    bulanan
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
                        'Data mengikuti Filter Statistik aktif.',
                    })
                  }
                />

              </div>

            </ScrollReveal>


            {/* TAHUNAN + PENONAKTIFAN */}

            <ScrollReveal
              distance={
                36
              }
            >

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
                      'Data mengikuti Filter Statistik aktif.',
                  })
                }
                onOpenYearMetric={(
                  item,
                  selectedMetric
                ) => {

                  const mapping = {
                    pendaftar: [
                      DETAIL_KIND.PENDAFTAR,
                      'Pendaftar',
                    ],

                    diterima: [
                      DETAIL_KIND.DITERIMA,
                      'Diterima',
                    ],

                    pending: [
                      DETAIL_KIND.PENDING,
                      'Pending',
                    ],

                    ditolak: [
                      DETAIL_KIND.DITOLAK,
                      'Ditolak',
                    ],
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
                      config[
                        0
                      ],

                    tahun:
                      String(
                        item.tahun
                      ),

                    title:
                      `${config[1]} — ${item.tahun}`,

                    subtitle:
                      'Data mengikuti Filter Statistik aktif.',
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
                      'Data mengikuti Filter Statistik aktif.',
                  })
                }
              />

            </ScrollReveal>

          </>
        )}


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