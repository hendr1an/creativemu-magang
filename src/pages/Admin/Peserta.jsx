import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

import { supabase } from '../../lib/supabaseClient';
import { kelolaAkun } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';

import ConfirmModal from '../../components/ConfirmModal';
import Modal from '../../components/Modal';


// =========================================================
// CONFIG
// =========================================================

const PAGE_SIZE = 10;

const STATUS = [
  'Semua',
  'Active',
  'Completed',
  'Dropped',
];

const BADGE = {
  Active: 'bg-emerald-500',
  Completed: 'bg-blue-500',
  Dropped: 'bg-red-500',
};

const ALASAN_NONAKTIF = [
  'Melanggar aturan presensi berulang',
  'Mengundurkan diri',
  'Magang dihentikan oleh sekolah/kampus',
  'Tidak aktif tanpa keterangan',
  'Alasan lain (tulis manual)',
];


// =========================================================
// DATE / EXPORT HELPERS
// =========================================================

function safe(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }

  return value;
}


function formatTanggalExcel(value) {
  if (!value) return '-';

  const valueString = String(value);

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueString)) {
    const [tahun, bulan, tanggal] =
      valueString.split('-');

    return `${tanggal}/${bulan}/${tahun}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return valueString;
  }

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}


function formatWaktuExcel(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}


function waktuExportWib() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date());
}


function tanggalNamaFile() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '');
}


function sanitizeSearch(value) {
  return String(value ?? '')
    .trim()
    .replace(/[%(),]/g, '');
}


function rentangBulan(value) {
  if (!value) {
    return null;
  }

  const [tahun, bulan] =
    value
      .split('-')
      .map(Number);

  if (!tahun || !bulan) {
    return null;
  }

  const awal =
    `${tahun}-${String(bulan).padStart(2, '0')}-01`;

  const nextDate =
    new Date(
      Date.UTC(
        tahun,
        bulan,
        1
      )
    );

  const akhirExclusive =
    `${nextDate.getUTCFullYear()}-${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, '0')}-01`;

  return {
    awal,
    akhirExclusive,
  };
}


// =========================================================
// COMPONENT
// =========================================================

export default function Peserta() {
  const [data, setData] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [status, setStatus] =
    useState('Semua');

  const [bulan, setBulan] =
    useState('');

  const [cari, setCari] =
    useState('');

  const [cariFinal, setCariFinal] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [pesan, setPesan] =
    useState(null);

  const [busyAkun, setBusyAkun] =
    useState(null);

  const [konfirmasi, setKonfirmasi] =
    useState(null);

  const [alasanModal, setAlasanModal] =
    useState(null);

  const [alasanText, setAlasanText] =
    useState('');

  const [alasanLain, setAlasanLain] =
    useState(false);

  const [exportBusy, setExportBusy] =
    useState(false);


  // =======================================================
  // LOAD EFFECT
  // =======================================================

  useEffect(() => {
    setPage(1);
  }, [
    status,
    bulan,
    cariFinal,
  ]);


  useEffect(() => {
    muat();
  }, [
    page,
    status,
    bulan,
    cariFinal,
  ]);


  // =======================================================
  // BUILD FILTERED QUERY
  // =======================================================

  function terapkanFilter(query) {
    let q = query;


    // STATUS
    if (status !== 'Semua') {
      q =
        q.eq(
          'status_magang',
          status
        );
    }


    // BULAN MULAI
    const range =
      rentangBulan(bulan);

    if (range) {
      q =
        q
          .gte(
            'tanggal_mulai',
            range.awal
          )
          .lt(
            'tanggal_mulai',
            range.akhirExclusive
          );
    }


    // SEARCH
    const kata =
      sanitizeSearch(cariFinal);

    if (kata) {
      q =
        q.or(
          [
            `nama_lengkap.ilike.%${kata}%`,
            `email.ilike.%${kata}%`,
            `instansi.ilike.%${kata}%`,
            `jurusan.ilike.%${kata}%`,
          ].join(',')
        );
    }


    return q;
  }


  // =======================================================
  // LOAD
  // =======================================================

  async function muat() {
    setLoading(true);
    setError(null);


    let q =
      supabase
        .from('interns')
        .select(
          '*',
          {
            count: 'exact',
          }
        )
        .order(
          'tanggal_mulai',
          {
            ascending: false,
          }
        );


    q =
      terapkanFilter(q);


    const from =
      (page - 1) *
      PAGE_SIZE;


    const {
      data: rows,
      count,
      error: err,
    } =
      await q.range(
        from,
        from +
          PAGE_SIZE -
          1
      );


    if (err) {
      setError(
        err.message
      );

      setData([]);
      setTotal(0);
    } else {
      setData(
        rows ?? []
      );

      setTotal(
        count ?? 0
      );
    }


    setLoading(false);
  }


  // =======================================================
  // EXPORT EXCEL
  // =======================================================

  async function handleExportExcel() {
    setExportBusy(true);
    setPesan(null);


    try {

      // =================================================
      // QUERY SEMUA DATA SESUAI FILTER
      //
      // Tidak memakai .range()
      // karena export harus mengambil seluruh data,
      // bukan hanya halaman aktif.
      // =================================================

      let q =
        supabase
          .from('interns')
          .select('*')
          .order(
            'tanggal_mulai',
            {
              ascending: false,
            }
          );


      q =
        terapkanFilter(q);


      const {
        data: internRows,
        error: internError,
      } =
        await q;


      if (internError) {
        throw internError;
      }


      const rows =
        internRows ?? [];


      if (rows.length === 0) {
        throw new Error(
          'Tidak ada data peserta yang sesuai dengan filter aktif.'
        );
      }


      // =================================================
      // GROUP
      // =================================================

      const groupIds = [
        ...new Set(
          rows
            .map(
              (row) =>
                row.group_id
            )
            .filter(Boolean)
        ),
      ];


      let groups = [];


      if (groupIds.length > 0) {
        const {
          data: groupRows,
          error: groupError,
        } =
          await supabase
            .from('groups')
            .select(
              `
              id,
              nama_kelompok,
              batch_label,
              mentor_id
              `
            )
            .in(
              'id',
              groupIds
            );


        if (groupError) {
          throw groupError;
        }


        groups =
          groupRows ?? [];
      }


      // =================================================
      // MENTOR
      // =================================================

      const mentorIds = [
        ...new Set(
          groups
            .map(
              (group) =>
                group.mentor_id
            )
            .filter(Boolean)
        ),
      ];


      let mentors = [];


      if (mentorIds.length > 0) {
        const {
          data: mentorRows,
          error: mentorError,
        } =
          await supabase
            .from('profiles')
            .select(
              `
              id,
              nama_lengkap,
              email
              `
            )
            .in(
              'id',
              mentorIds
            );


        if (mentorError) {
          throw mentorError;
        }


        mentors =
          mentorRows ?? [];
      }


      // =================================================
      // APPLICATION
      //
      // Untuk tanggal pengajuan/pendaftaran.
      // =================================================

      const applicationIds = [
        ...new Set(
          rows
            .map(
              (row) =>
                row.application_id
            )
            .filter(Boolean)
        ),
      ];


      let applications = [];


      if (
        applicationIds.length >
        0
      ) {
        const {
          data: applicationRows,
          error: applicationError,
        } =
          await supabase
            .from('applications')
.select(`
  id,
  created_at,
  status_pendaftaran
`)
            .in(
              'id',
              applicationIds
            );


        if (applicationError) {
          throw applicationError;
        }


        applications =
          applicationRows ?? [];
      }


      // =================================================
      // MAP RELATION
      // =================================================

      const groupMap =
        new Map(
          groups.map(
            (group) => [
              group.id,
              group,
            ]
          )
        );


      const mentorMap =
        new Map(
          mentors.map(
            (mentor) => [
              mentor.id,
              mentor,
            ]
          )
        );


      const applicationMap =
        new Map(
          applications.map(
            (application) => [
              application.id,
              application,
            ]
          )
        );


      // =================================================
      // EXCEL ROWS
      // =================================================

      const excelRows =
        rows.map(
          (
            row,
            index
          ) => {

            const group =
              row.group_id
                ? groupMap.get(
                    row.group_id
                  )
                : null;


            const mentor =
              group?.mentor_id
                ? mentorMap.get(
                    group.mentor_id
                  )
                : null;


            const application =
              row.application_id
                ? applicationMap.get(
                    row.application_id
                  )
                : null;


            return {
              No:
                index + 1,

              'Nama Lengkap':
                safe(
                  row.nama_lengkap
                ),

              Email:
                safe(
                  row.email
                ),

              'Nomor WhatsApp':
                safe(
                  row.nomor_whatsapp
                ),

              Instansi:
                safe(
                  row.instansi
                ),

              'Jurusan / Program Studi':
                safe(
                  row.jurusan
                ),

              Divisi:
                safe(
                  row.divisi
                ),

              'Tanggal Mulai':
                formatTanggalExcel(
                  row.tanggal_mulai
                ),

              'Tanggal Selesai':
                formatTanggalExcel(
                  row.tanggal_selesai
                ),

              Durasi:
                row.durasi_magang
                  ? `${row.durasi_magang} ${
                      row.satuan_durasi ??
                      'bulan'
                    }`
                  : '-',

              'Status Magang':
                safe(
                  row.status_magang
                ),

              Kelompok:
                safe(
                  group
                    ?.nama_kelompok
                ),

              Batch:
                safe(
                  group
                    ?.batch_label
                ),

              Mentor:
                safe(
                  mentor
                    ?.nama_lengkap
                ),

              'Email Mentor':
                safe(
                  mentor
                    ?.email
                ),

              'Nilai Final':
                safe(
                  row.nilai_final
                ),

              'Tanggal Pendaftaran':
                formatWaktuExcel(
                  application
                    ?.created_at
                ),

              'Status Pengajuan':
  safe(
    application
      ?.status_pendaftaran
  ),

              'Tanggal Pendaftaran Diinferensi':
                row.registration_date_inferred
                  ? 'Ya'
                  : 'Tidak',

              'Sumber Data':
                row.data_source ===
                'legacy_import'
                  ? 'Import Data Magang Historis'
                  : 'Sistem Creativemu',

              'Status Asli Legacy':
                safe(
                  row.legacy_status_original
                ),

              'Jobdesk Historis':
                safe(
                  row.legacy_jobdesk
                ),
            };
          }
        );


      // =================================================
      // WORKSHEET 1
      // =================================================

      const wsData =
        XLSX.utils.json_to_sheet(
          excelRows
        );


      wsData['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 32 },
        { wch: 20 },
        { wch: 40 },
        { wch: 36 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 28 },
        { wch: 20 },
        { wch: 28 },
        { wch: 32 },
        { wch: 14 },
        { wch: 28 },
        { wch: 20 },
        { wch: 28 },
        { wch: 28 },
        { wch: 22 },
        { wch: 42 },
      ];


      if (wsData['!ref']) {
        wsData['!autofilter'] = {
          ref:
            wsData['!ref'],
        };
      }


      // =================================================
      // WORKSHEET 2 — INFO EXPORT
      // =================================================

      const infoRows = [
        {
          Keterangan:
            'Nama Laporan',

          Nilai:
            'Data Magang Creativemu',
        },

        {
          Keterangan:
            'Waktu Export',

          Nilai:
            waktuExportWib(),
        },

        {
          Keterangan:
            'Jumlah Peserta',

          Nilai:
            rows.length,
        },

        {
          Keterangan:
            'Filter Status',

          Nilai:
            status ||
            'Semua',
        },

        {
          Keterangan:
            'Filter Bulan Mulai',

          Nilai:
            bulan ||
            'Semua',
        },

        {
          Keterangan:
            'Pencarian',

          Nilai:
            cariFinal.trim() ||
            'Semua',
        },

        {
          Keterangan:
            'Catatan',

          Nilai:
            'Data export mengikuti seluruh filter aktif pada halaman Data Peserta Magang dan tidak dibatasi pagination.',
        },
      ];


      const wsInfo =
        XLSX.utils.json_to_sheet(
          infoRows
        );


      wsInfo['!cols'] = [
        {
          wch: 28,
        },

        {
          wch: 80,
        },
      ];


      // =================================================
      // WORKBOOK
      // =================================================

      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        wsData,
        'Data Peserta'
      );


      XLSX.utils.book_append_sheet(
        workbook,
        wsInfo,
        'Informasi Export'
      );


      // =================================================
      // FILENAME
      // =================================================

      const filterParts = [];


      if (
        status !==
        'Semua'
      ) {
        filterParts.push(
          status
        );
      }


      if (bulan) {
        filterParts.push(
          bulan.replace(
            '-',
            ''
          )
        );
      }


      const suffix =
        filterParts.length > 0
          ? `_${filterParts.join('_')}`
          : '';


      const filename =
        `Data_Magang_Creativemu${suffix}_${tanggalNamaFile()}.xlsx`;


      XLSX.writeFile(
        workbook,
        filename,
        {
          compression: true,
        }
      );


      setPesan({
        tipe: 'ok',

        teks:
          `✅ ${rows.length} data peserta berhasil diekspor ke Excel.`,
      });

    } catch (e) {

      console.error(
        'Export Excel gagal:',
        e
      );


      setPesan({
        tipe: 'err',

        teks:
          e?.message ??
          'Export Excel gagal.',
      });

    } finally {

      setExportBusy(
        false
      );

    }
  }


  // =======================================================
  // TOGGLE ACCOUNT
  // =======================================================

  function toggleAkun(row) {
    const aksi =
      row.status_magang ===
      'Dropped'
        ? 'aktifkan'
        : 'nonaktifkan';


    if (
      aksi ===
      'aktifkan'
    ) {
      setKonfirmasi({
        judul:
          `🟢 Aktifkan akun "${row.nama_lengkap}"?`,

        teks:
          'Peserta akan bisa login kembali seperti biasa.',

        teksConfirm:
          'Ya, Aktifkan',

        tipe:
          'info',

        row,

        aksi,
      });

    } else {

      setAlasanModal({
        row,
      });


      setAlasanText(
        ''
      );


      setAlasanLain(
        false
      );

    }
  }


  // =======================================================
  // EXECUTE ACTIVATE
  // =======================================================

  async function eksekusiKonfirmasi() {
    if (!konfirmasi) {
      return;
    }


    const {
      row,
      aksi,
    } =
      konfirmasi;


    setBusyAkun(
      row.user_id
    );

    setPesan(
      null
    );


    try {

      const hasil =
        await kelolaAkun(
          row.user_id,
          aksi
        );


      setPesan({
        tipe: 'ok',
        teks:
          `✅ ${hasil.pesan}`,
      });


      setKonfirmasi(
        null
      );


      await muat();

    } catch (e) {

      setPesan({
        tipe: 'err',
        teks:
          e.message,
      });

    } finally {

      setBusyAkun(
        null
      );

    }
  }


  // =======================================================
  // NONAKTIF DENGAN ALASAN
  // =======================================================

  async function eksekusiDenganAlasan() {
    if (!alasanModal) {
      return;
    }


    const {
      row,
    } =
      alasanModal;


    if (
      !alasanText.trim() ||
      alasanText ===
        'Alasan lain (tulis manual)'
    ) {
      return;
    }


    setBusyAkun(
      row.user_id
    );

    setPesan(
      null
    );


    try {

      const hasil =
        await kelolaAkun(
          row.user_id,
          'nonaktifkan'
        );


      const {
        data: sesi,
      } =
        await supabase.auth.getSession();


      const {
        error:
          suspensionError,
      } =
        await supabase
          .from(
            'account_suspensions'
          )
          .insert({
            intern_id:
              row.id,

            alasan:
              alasanText.trim(),

            suspended_by:
              sesi?.session
                ?.user?.id,
          });


      if (
        suspensionError
      ) {
        throw suspensionError;
      }


      setPesan({
        tipe: 'ok',
        teks:
          `✅ ${hasil.pesan}`,
      });


      setAlasanModal(
        null
      );

      setAlasanText(
        ''
      );

      setAlasanLain(
        false
      );


      await muat();

    } catch (e) {

      setPesan({
        tipe: 'err',
        teks:
          e.message,
      });

    } finally {

      setBusyAkun(
        null
      );

    }
  }


  // =======================================================
  // RESET FILTER
  // =======================================================

  function resetFilter() {
    setStatus('Semua');
    setBulan('');
    setCari('');
    setCariFinal('');
    setPage(1);
  }


  const filterAktif =
    status !== 'Semua' ||
    Boolean(bulan) ||
    Boolean(
      cariFinal.trim()
    );


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="anim-up flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Data Peserta Magang
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola peserta, data pendidikan,
            periode magang, dan status akun.
          </p>

        </div>


        <button
          type="button"
          onClick={
            handleExportExcel
          }
          disabled={
            exportBusy ||
            loading ||
            total === 0
          }
          className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >

          {exportBusy ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

              Mengekspor…
            </>
          ) : (
            <>
              📊 Export Excel
            </>
          )}

        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>

      )}


      {/* =================================================
          MESSAGE
      ================================================= */}

      {pesan && (

        <p
          className={`anim-down mt-4 rounded-xl p-3 text-sm ${
            pesan.tipe ===
            'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {pesan.teks}
        </p>

      )}


      {/* =================================================
          FILTER
      ================================================= */}

      <div className="anim-up mt-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm [animation-delay:60ms]">

        <div className="flex flex-wrap items-center gap-2">

          {STATUS.map(
            (s) => (

              <button
                key={s}
                type="button"
                onClick={() =>
                  setStatus(
                    s
                  )
                }
                className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  status === s
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {s}
              </button>

            )
          )}


          <input
            type="month"
            value={bulan}
            onChange={(e) =>
              setBulan(
                e.target.value
              )
            }
            title="Filter bulan mulai"
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
          />


          <form
            onSubmit={(e) => {
              e.preventDefault();

              setCariFinal(
                cari
              );

              setPage(1);
            }}
            className="flex min-w-0 flex-1 gap-2 sm:flex-none"
          >

            <input
              value={cari}
              onChange={(e) =>
                setCari(
                  e.target.value
                )
              }
              placeholder="Cari nama, email, instansi, jurusan…"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none sm:min-w-[240px]"
            />


            <button
              type="submit"
              className="btn-press rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              🔍
            </button>

          </form>


          {filterAktif && (

            <button
              type="button"
              onClick={
                resetFilter
              }
              className="btn-press rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
            >
              ↺ Reset
            </button>

          )}

        </div>


        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">

          <p className="text-[11px] text-slate-400">
            {filterAktif
              ? 'Export Excel akan mengikuti filter aktif dan tetap mengambil semua halaman.'
              : 'Export Excel akan mengambil seluruh data peserta magang.'}
          </p>


          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
            {total} data
          </span>

        </div>

      </div>


      {/* =================================================
          LIST
      ================================================= */}

      {loading ? (

        <div className="mt-4 space-y-3">

          {Array.from({
            length: 4,
          }).map(
            (_, i) => (

              <div
                key={i}
                className="skeleton h-24 rounded-2xl"
              />

            )
          )}

        </div>

      ) : data.length === 0 ? (

        <div className="anim-up mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">

          <p className="anim-float text-5xl">
            🔍
          </p>

          <p className="mt-4 font-bold text-slate-600">
            Tidak Ada Data
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Coba ubah filter atau kata pencarian
          </p>

        </div>

      ) : (

        <div className="mt-4 space-y-3">

          {data.map(
            (r, i) => (

              <div
                key={r.id}
                className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                style={{
                  animationDelay:
                    `${i * 70}ms`,
                }}
              >

                {/* STATUS STRIPE */}

                <div
                  className={`absolute inset-y-0 left-0 w-1.5 ${
                    BADGE[
                      r.status_magang
                    ] ??
                    'bg-slate-300'
                  }`}
                />


                <div className="flex flex-col gap-3 pl-3 lg:flex-row lg:items-center lg:justify-between">

                  {/* INFO */}

                  <div className="flex min-w-0 items-start gap-3">

                    {/* AVATAR */}

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">

                      {r.nama_lengkap
                        ?.split(' ')
                        .map(
                          (x) =>
                            x[0]
                        )
                        .slice(
                          0,
                          2
                        )
                        .join('')}

                    </span>


                    <div className="min-w-0 flex-1">

                      {/* NAME */}

                      <Link
                        to={`/admin/peserta/${r.id}`}
                        className="text-sm font-bold text-indigo-600 hover:underline"
                      >
                        {r.nama_lengkap}{' '}
                        ↗
                      </Link>


                      {/* CONTACT */}

                      <p className="mt-0.5 break-words text-[11px] text-slate-400">

                        {r.email}

                        {r.nomor_whatsapp &&
                          ` · ${r.nomor_whatsapp}`}

                      </p>


                      {/* EDUCATION */}

                      <div className="mt-2 flex flex-wrap gap-1.5">

                        {r.instansi && (

                          <span className="max-w-full rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                            🏫{' '}
                            {r.instansi}
                          </span>

                        )}


                        <span
                          className={`max-w-full rounded-lg px-2 py-1 text-[10px] font-semibold ${
                            r.jurusan
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          🎓{' '}

                          {r.jurusan ??
                            'Jurusan belum diisi'}
                        </span>


                        {r.divisi && (

                          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">
                            🧩{' '}
                            {r.divisi}
                          </span>

                        )}

                      </div>


                      {/* PERIOD */}

                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">

                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5">

                          📅{' '}

                          {fmtTanggal(
                            r.tanggal_mulai
                          )}

                          {' – '}

                          {fmtTanggal(
                            r.tanggal_selesai
                          )}

                          {' ('}

                          {r.durasi_magang}{' '}

                          {r.satuan_durasi ??
                            'bulan'}

                          {')'}

                        </span>


                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white ${
                            BADGE[
                              r.status_magang
                            ] ??
                            'bg-slate-400'
                          }`}
                        >
                          {r.status_magang?.toUpperCase()}
                        </span>


                        <span className="text-slate-700">
                          ⭐{' '}
                          {r.nilai_final ??
                            '—'}
                        </span>

                      </p>

                    </div>

                  </div>


                  {/* ACTION */}

                  <div className="flex shrink-0 items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        toggleAkun(
                          r
                        )
                      }
                      disabled={
                        busyAkun ===
                          r.user_id ||
                        !r.user_id
                      }
                      title={
                        !r.user_id
                          ? 'Peserta historis tanpa akun login'
                          : undefined
                      }
                      className={`btn-press rounded-xl px-4 py-2.5 text-xs font-bold shadow disabled:cursor-not-allowed disabled:opacity-50 ${
                        r.status_magang ===
                        'Dropped'
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
                          : 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100'
                      }`}
                    >

                      {busyAkun ===
                      r.user_id
                        ? '⏳'
                        : r.status_magang ===
                            'Dropped'
                          ? '🟢 Aktifkan'
                          : '🔴 Nonaktifkan'}

                    </button>

                  </div>

                </div>

              </div>

            )
          )}


          {/* PAGINATION */}

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">

            <span>

              Menampilkan{' '}

              <b>

                {total === 0
                  ? 0
                  : (page - 1) *
                      PAGE_SIZE +
                    1}

                {' – '}

                {Math.min(
                  page *
                    PAGE_SIZE,
                  total
                )}

              </b>{' '}

              dari{' '}

              <b>
                {total}
              </b>{' '}

              data

            </span>


            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setPage(
                    page - 1
                  )
                }
                disabled={
                  page <= 1
                }
                className="btn-press rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                ← Sebelumnya
              </button>


              <span className="text-xs">

                Hal.{' '}

                <b>
                  {page}
                </b>{' '}

                /{' '}

                {Math.max(
                  Math.ceil(
                    total /
                      PAGE_SIZE
                  ),
                  1
                )}

              </span>


              <button
                type="button"
                onClick={() =>
                  setPage(
                    page + 1
                  )
                }
                disabled={
                  page >=
                  Math.ceil(
                    total /
                      PAGE_SIZE
                  )
                }
                className="btn-press rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                Berikutnya →
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          CONFIRM ACTIVATE
      ================================================= */}

      <ConfirmModal
        open={
          !!konfirmasi
        }

        onClose={() =>
          setKonfirmasi(
            null
          )
        }

        onConfirm={
          eksekusiKonfirmasi
        }

        busy={
          busyAkun != null
        }

        judul={
          konfirmasi?.judul
        }

        teks={
          konfirmasi?.teks
        }

        teksConfirm={
          konfirmasi?.teksConfirm
        }

        tipe={
          konfirmasi?.tipe
        }
      />


      {/* =================================================
          NONACTIVE REASON
      ================================================= */}

      <Modal
        open={
          !!alasanModal
        }

        onClose={() => {

          setAlasanModal(
            null
          );

          setAlasanText(
            ''
          );

          setAlasanLain(
            false
          );

        }}

        title={`🔴 Nonaktifkan "${alasanModal?.row?.nama_lengkap ?? ''}"`}
      >

        {alasanModal && (

          <form
            onSubmit={(e) => {

              e.preventDefault();

              eksekusiDenganAlasan();

            }}
          >

            <p className="text-sm leading-relaxed text-slate-600">
              Pilih alasan penonaktifan — akan
              tersimpan untuk rekap statistik
              administrasi.
            </p>


            {/* IDENTITAS */}

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">

              <p>
                🏫{' '}
                {alasanModal.row.instansi ??
                  'Instansi belum diisi'}
              </p>


              <p className="mt-1">
                🎓{' '}
                {alasanModal.row.jurusan ??
                  'Jurusan / Program Studi belum diisi'}
              </p>


              <p className="mt-1">
                🧩{' '}
                {alasanModal.row.divisi ??
                  'Divisi belum diatur'}
              </p>

            </div>


            <div className="mt-3 space-y-2">

              {ALASAN_NONAKTIF.map(
                (a) => (

                  <button
                    key={a}
                    type="button"

                    onClick={() => {

                      setAlasanText(
                        a
                      );

                      setAlasanLain(
                        a.includes(
                          'lain'
                        )
                      );

                    }}

                    className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                      alasanText ===
                      a
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'
                    }`}
                  >

                    {alasanText ===
                    a
                      ? '✓ '
                      : ''}

                    {a}

                  </button>

                )
              )}

            </div>


            {alasanLain && (

              <input
                type="text"

                value={
                  alasanText ===
                  'Alasan lain (tulis manual)'
                    ? ''
                    : alasanText
                }

                onChange={(e) =>
                  setAlasanText(
                    e.target.value
                  )
                }

                placeholder="Tulis alasan di sini…"

                className="anim-down mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-red-400 focus:outline-none"
              />

            )}


            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">

              <button
                type="button"

                onClick={() => {

                  setAlasanModal(
                    null
                  );

                  setAlasanText(
                    ''
                  );

                  setAlasanLain(
                    false
                  );

                }}

                className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>


              <button
                type="submit"

                disabled={
                  busyAkun ||
                  !alasanText.trim() ||
                  alasanText ===
                    'Alasan lain (tulis manual)'
                }

                className="btn-press rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >

                {busyAkun
                  ? 'Memproses...'
                  : 'Ya, Nonaktifkan'}

              </button>

            </div>

          </form>

        )}

      </Modal>

    </div>
  );
}