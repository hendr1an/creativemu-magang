import * as XLSX from 'xlsx';


// =========================================================
// HELPERS
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


function formatTanggal(value) {
  if (!value) return '-';

  const [tahun, bulan, tanggal] =
    String(value).split('-');

  if (!tahun || !bulan || !tanggal) {
    return value;
  }

  return `${tanggal}/${bulan}/${tahun}`;
}


function waktuWib() {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }
  ).format(new Date());
}


function tanggalNamaFile() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    )
      .format(new Date())
      .split('-');

  return parts.join('');
}


// =========================================================
// MAIN EXPORT
// =========================================================

export function exportPesertaExcel({
  rows,
  filters,
}) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    throw new Error(
      'Tidak ada data peserta yang dapat diekspor.'
    );
  }


  // =====================================================
  // SHEET 1 — DATA MAGANG
  // =====================================================

  const pesertaRows = rows.map(
    (row, index) => ({
      No:
        index + 1,

      'Nama Lengkap':
        safe(row.nama_lengkap),

      Email:
        safe(row.email),

      'Nomor WhatsApp':
        safe(row.nomor_whatsapp),

      Instansi:
        safe(row.instansi),

      'Jurusan / Program Studi':
        safe(row.jurusan),

      Divisi:
        safe(row.divisi),

      'Tanggal Mulai':
        formatTanggal(
          row.tanggal_mulai
        ),

      'Tanggal Selesai':
        formatTanggal(
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
        safe(row.status_magang),

      Kelompok:
        safe(
          row.export_group_name
        ),

      Batch:
        safe(
          row.export_batch_label
        ),

      Mentor:
        safe(
          row.export_mentor_name
        ),

      'Email Mentor':
        safe(
          row.export_mentor_email
        ),

      'Nilai Final':
        safe(row.nilai_final),

      'Sumber Data':
        row.data_source ===
        'legacy_import'
          ? 'Import Data Magang Historis'
          : 'Sistem Creativemu',

      'Tanggal Pendaftaran':
        formatTanggal(
          row.registration_date ??
          row.tanggal_pendaftaran ??
          null
        ),

      'Tanggal Pendaftaran Diinferensi':
        row.registration_date_inferred
          ? 'Ya'
          : 'Tidak',

      'Jobdesk Historis':
        safe(
          row.legacy_jobdesk
        ),
    })
  );


  const wsPeserta =
    XLSX.utils.json_to_sheet(
      pesertaRows
    );


  wsPeserta['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 32 },
    { wch: 20 },
    { wch: 38 },
    { wch: 34 },
    { wch: 20 },
    { wch: 17 },
    { wch: 17 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 28 },
    { wch: 32 },
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 28 },
    { wch: 42 },
  ];


  if (wsPeserta['!ref']) {
    wsPeserta['!autofilter'] = {
      ref: wsPeserta['!ref'],
    };
  }


  // =====================================================
  // SHEET 2 — INFO EXPORT
  // =====================================================

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
        waktuWib(),
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
        filters.status ||
        'Semua',
    },

    {
      Keterangan:
        'Filter Bulan Mulai',

      Nilai:
        filters.bulan ||
        'Semua',
    },

    {
      Keterangan:
        'Pencarian',

      Nilai:
        filters.cari ||
        'Semua',
    },

    {
      Keterangan:
        'Catatan',

      Nilai:
        'Export mengikuti filter aktif pada halaman Data Peserta Magang dan tidak dibatasi pagination.',
    },
  ];


  const wsInfo =
    XLSX.utils.json_to_sheet(
      infoRows
    );


  wsInfo['!cols'] = [
    { wch: 28 },
    { wch: 75 },
  ];


  // =====================================================
  // WORKBOOK
  // =====================================================

  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    wsPeserta,
    'Data Peserta'
  );


  XLSX.utils.book_append_sheet(
    workbook,
    wsInfo,
    'Informasi Export'
  );


  // =====================================================
  // FILE NAME
  // =====================================================

  const bagianFilter = [];

  if (
    filters.status &&
    filters.status !== 'Semua'
  ) {
    bagianFilter.push(
      filters.status
    );
  }


  if (filters.bulan) {
    bagianFilter.push(
      filters.bulan
        .replace('-', '')
    );
  }


  const suffixFilter =
    bagianFilter.length > 0
      ? `_${bagianFilter.join('_')}`
      : '';


  const filename =
    `Data_Magang_Creativemu${suffixFilter}_${tanggalNamaFile()}.xlsx`;


  XLSX.writeFile(
    workbook,
    filename,
    {
      compression: true,
    }
  );


  return {
    filename,
    total:
      rows.length,
  };
}