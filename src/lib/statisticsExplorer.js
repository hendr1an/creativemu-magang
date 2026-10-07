import {
  supabase,
} from './supabaseClient';


/* =========================================================
   CONSTANTS
========================================================= */

export const DETAIL_KIND = {
  PENDAFTAR: 'pendaftar',
  DITERIMA: 'diterima',
  PENDING: 'pending',
  DITOLAK: 'ditolak',

  PESERTA: 'peserta',
  AKTIF: 'aktif',
  SELESAI: 'selesai',
  NONAKTIF: 'nonaktif',

  MULAI_MAGANG: 'mulai_magang',

  DIVISI: 'divisi',
  INSTANSI: 'instansi',
  JURUSAN: 'jurusan',

  PENONAKTIFAN: 'penonaktifan',
};


export const DETAIL_LABEL = {
  pendaftar:
    'Pendaftar',

  diterima:
    'Pendaftar Diterima',

  pending:
    'Pendaftar Pending',

  ditolak:
    'Pendaftar Ditolak',

  peserta:
    'Peserta Magang',

  aktif:
    'Peserta Aktif',

  selesai:
    'Peserta Selesai',

  nonaktif:
    'Peserta Nonaktif',

  mulai_magang:
    'Peserta Mulai Magang',

  divisi:
    'Data Divisi',

  instansi:
    'Data Instansi',

  jurusan:
    'Data Jurusan / Program Studi',

  penonaktifan:
    'Riwayat Penonaktifan',
};


/* =========================================================
   TEXT HELPERS
========================================================= */

function normalizeText(
  value
) {
  return String(
    value ??
    ''
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .toLowerCase();
}


function isEmptyJurusan(
  value
) {
  return (
    value === null ||
    value === undefined ||
    String(
      value
    ).trim() ===
      ''
  );
}


/* =========================================================
   DATE HELPERS
========================================================= */

export function rentangBulan(
  bulan
) {
  if (
    !bulan ||
    !/^\d{4}-\d{2}$/.test(
      bulan
    )
  ) {
    return null;
  }


  const [
    tahun,
    nomorBulan,
  ] =
    bulan
      .split('-')
      .map(Number);


  const mulai =
    `${tahun}-${String(
      nomorBulan
    ).padStart(
      2,
      '0'
    )}-01`;


  const next =
    new Date(
      Date.UTC(
        tahun,
        nomorBulan,
        1
      )
    );


  const selesai =
    next
      .toISOString()
      .slice(
        0,
        10
      );


  return {
    mulai,
    selesai,
  };
}


export function namaBulanDetail(
  bulan
) {
  if (
    !bulan ||
    !/^\d{4}-\d{2}$/.test(
      bulan
    )
  ) {
    return bulan ??
      '';
  }


  const [
    tahun,
    nomorBulan,
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
        tahun,
        nomorBulan - 1,
        1
      )
    )
  );
}


export function tanggalStatistik(
  iso
) {
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
    new Date(
      iso
    )
  );
}


export function tanggalWaktuStatistik(
  iso
) {
  if (!iso) {
    return '—';
  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }
  ).format(
    new Date(
      iso
    )
  );
}


function calendarParts(
  value
) {
  if (!value) {
    return null;
  }


  const stringValue =
    String(
      value
    );


  /*
    DATE dari PostgreSQL.
    Hindari timezone conversion.
  */
  const dateOnlyMatch =
    stringValue.match(
      /^(\d{4})-(\d{2})-\d{2}$/
    );


  if (
    dateOnlyMatch
  ) {
    return {
      year:
        Number(
          dateOnlyMatch[
            1
          ]
        ),

      month:
        Number(
          dateOnlyMatch[
            2
          ]
        ),
    };
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        year: 'numeric',
        month: '2-digit',
        timeZone: 'Asia/Jakarta',
      }
    ).formatToParts(
      date
    );


  const year =
    Number(
      parts.find(
        (part) =>
          part.type ===
          'year'
      )?.value
    );


  const month =
    Number(
      parts.find(
        (part) =>
          part.type ===
          'month'
      )?.value
    );


  return {
    year,
    month,
  };
}


function filterCalendar(
  rows,
  field,
  {
    tahun,
    bulanNomor,
  }
) {
  const targetYear =
    tahun &&
    tahun !==
      'Semua'
      ? Number(
          tahun
        )
      : null;


  const targetMonth =
    bulanNomor &&
    bulanNomor !==
      'Semua'
      ? Number(
          bulanNomor
        )
      : null;


  if (
    !targetYear &&
    !targetMonth
  ) {
    return rows;
  }


  return rows.filter(
    (row) => {
      const parts =
        calendarParts(
          row[
            field
          ]
        );


      if (!parts) {
        return false;
      }


      if (
        targetYear &&
        parts.year !==
          targetYear
      ) {
        return false;
      }


      if (
        targetMonth &&
        parts.month !==
          targetMonth
      ) {
        return false;
      }


      return true;
    }
  );
}


/* =========================================================
   NORMALIZERS
========================================================= */

function normalizeApplication(
  row
) {
  return {
    id: row.id,

    source:
      'application',

    sourceId:
      row.id,

    nama:
      row.nama_lengkap,

    email:
      row.email,

    whatsapp:
      row.nomor_whatsapp,

    instansi:
      row.instansi,

    jurusan:
      row.jurusan,

    divisi:
      row.divisi,

    status:
      row.status_pendaftaran,

    tanggal:
      row.created_at,

    tanggalMulai:
      row.tanggal_mulai,

    tanggalSelesai:
      row.tanggal_selesai_custom,

    nilai:
      null,

    alasan:
      row.catatan_admin,

    raw:
      row,
  };
}


function normalizeIntern(
  row
) {
  return {
    id: row.id,

    source:
      'intern',

    sourceId:
      row.id,

    nama:
      row.nama_lengkap,

    email:
      row.email,

    whatsapp:
      row.nomor_whatsapp,

    instansi:
      row.instansi,

    jurusan:
      row.jurusan,

    divisi:
      row.divisi,

    status:
      row.status_magang,

    tanggal:
      row.created_at,

    tanggalMulai:
      row.tanggal_mulai,

    tanggalSelesai:
      row.tanggal_selesai,

    nilai:
      row.nilai_final,

    alasan:
      null,

    raw:
      row,
  };
}


function normalizeSuspension(
  row
) {
  const intern =
    row.interns;


  return {
    id:
      row.id,

    source:
      'suspension',

    sourceId:
      row.id,

    internId:
      intern?.id ??
      row.intern_id,

    nama:
      intern?.nama_lengkap ??
      'Peserta tidak ditemukan',

    email:
      intern?.email,

    whatsapp:
      intern?.nomor_whatsapp,

    instansi:
      intern?.instansi,

    jurusan:
      intern?.jurusan,

    divisi:
      intern?.divisi,

    status:
      intern?.status_magang ??
      'Dropped',

    tanggal:
      row.created_at,

    tanggalMulai:
      intern?.tanggal_mulai,

    tanggalSelesai:
      intern?.tanggal_selesai,

    nilai:
      intern?.nilai_final,

    alasan:
      row.alasan,

    raw:
      row,
  };
}


/* =========================================================
   SHARED FILTERS
========================================================= */

function filterJurusan(
  rows,
  jurusan
) {
  if (
    !jurusan ||
    jurusan ===
      'Semua'
  ) {
    return rows;
  }


  if (
    normalizeText(
      jurusan
    ) ===
    'belum diisi'
  ) {
    return rows.filter(
      (row) =>
        isEmptyJurusan(
          row.jurusan
        )
    );
  }


  const target =
    normalizeText(
      jurusan
    );


  return rows.filter(
    (row) =>
      normalizeText(
        row.jurusan
      ) ===
      target
  );
}


function filterInstansi(
  rows,
  instansi
) {
  if (!instansi) {
    return rows;
  }


  const target =
    normalizeText(
      instansi
    );


  return rows.filter(
    (row) =>
      normalizeText(
        row.instansi
      ) ===
      target
  );
}


/* =========================================================
   APPLICATIONS
========================================================= */

async function loadApplications(
  options,
  forcedStatus =
    null
) {
  /*
    Kalau Global Filter Approved tetapi
    user membuka card Pending yang nilainya 0,
    hasil harus tetap 0.
  */
  if (
    forcedStatus &&
    options.statusPendaftaran &&
    options.statusPendaftaran !==
      'Semua' &&
    forcedStatus !==
      options.statusPendaftaran
  ) {
    return [];
  }


  const effectiveStatus =
    forcedStatus ??
    (
      options.statusPendaftaran &&
      options.statusPendaftaran !==
        'Semua'
        ? options.statusPendaftaran
        : null
    );


  let query =
    supabase
      .from(
        'applications'
      )
      .select(`
        id,
        nama_lengkap,
        email,
        nomor_whatsapp,
        instansi,
        jurusan,
        divisi,
        status_pendaftaran,
        tanggal_mulai,
        tanggal_selesai_custom,
        created_at,
        catatan_admin
      `)
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      );


  if (
    effectiveStatus
  ) {
    query =
      query.eq(
        'status_pendaftaran',
        effectiveStatus
      );
  }


  if (
    options.divisi &&
    options.divisi !==
      'Semua'
  ) {
    query =
      query.eq(
        'divisi',
        options.divisi
      );
  }


  /*
    Exact monthly drill-down.
  */
  const exactRange =
    rentangBulan(
      options.bulan
    );


  if (
    exactRange
  ) {
    query =
      query
        .gte(
          'created_at',
          `${exactRange.mulai}T00:00:00`
        )
        .lt(
          'created_at',
          `${exactRange.selesai}T00:00:00`
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua' &&
    (
      !options.bulanNomor ||
      options.bulanNomor ===
        'Semua'
    )
  ) {
    query =
      query
        .gte(
          'created_at',
          `${options.tahun}-01-01T00:00:00`
        )
        .lt(
          'created_at',
          `${
            Number(
              options.tahun
            ) +
            1
          }-01-01T00:00:00`
        );
  }


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  let rows =
    (
      data ??
      []
    ).map(
      normalizeApplication
    );


  rows =
    filterJurusan(
      rows,
      options.jurusan
    );


  rows =
    filterInstansi(
      rows,
      options.instansi
    );


  if (
    !exactRange
  ) {
    rows =
      filterCalendar(
        rows,
        'tanggal',
        {
          tahun:
            options.tahun,

          bulanNomor:
            options.bulanNomor,
        }
      );
  }


  return rows;
}


/* =========================================================
   INTERNS
========================================================= */

async function loadInterns(
  options,
  forcedStatus =
    null,
  dateColumn =
    'tanggal_mulai'
) {
  if (
    forcedStatus &&
    options.statusMagang &&
    options.statusMagang !==
      'Semua' &&
    forcedStatus !==
      options.statusMagang
  ) {
    return [];
  }


  const effectiveStatus =
    forcedStatus ??
    (
      options.statusMagang &&
      options.statusMagang !==
        'Semua'
        ? options.statusMagang
        : null
    );


  let query =
    supabase
      .from(
        'interns'
      )
      .select(`
        id,
        application_id,
        nama_lengkap,
        email,
        nomor_whatsapp,
        instansi,
        jurusan,
        divisi,
        status_magang,
        tanggal_mulai,
        tanggal_selesai,
        nilai_final,
        created_at
      `)
      .order(
        dateColumn,
        {
          ascending:
            false,
        }
      );


  if (
    effectiveStatus
  ) {
    query =
      query.eq(
        'status_magang',
        effectiveStatus
      );
  }


  if (
    options.divisi &&
    options.divisi !==
      'Semua'
  ) {
    query =
      query.eq(
        'divisi',
        options.divisi
      );
  }


  const exactRange =
    rentangBulan(
      options.bulan
    );


  if (
    exactRange
  ) {
    query =
      query
        .gte(
          dateColumn,
          exactRange.mulai
        )
        .lt(
          dateColumn,
          exactRange.selesai
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua' &&
    (
      !options.bulanNomor ||
      options.bulanNomor ===
        'Semua'
    )
  ) {
    query =
      query
        .gte(
          dateColumn,
          `${options.tahun}-01-01`
        )
        .lt(
          dateColumn,
          `${
            Number(
              options.tahun
            ) +
            1
          }-01-01`
        );
  }


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  let rows =
    (
      data ??
      []
    ).map(
      normalizeIntern
    );


  rows =
    filterJurusan(
      rows,
      options.jurusan
    );


  rows =
    filterInstansi(
      rows,
      options.instansi
    );


  if (
    !exactRange
  ) {
    /*
      Backend global statistics memakai
      tanggal_mulai untuk domain Intern.
    */
    rows =
      filterCalendar(
        rows,
        'tanggalMulai',
        {
          tahun:
            options.tahun,

          bulanNomor:
            options.bulanNomor,
        }
      );
  }


  return rows;
}


/* =========================================================
   SUSPENSIONS
========================================================= */

async function loadSuspensions(
  options
) {
  let query =
    supabase
      .from(
        'account_suspensions'
      )
      .select(`
        id,
        intern_id,
        alasan,
        created_at,
        interns(
          id,
          nama_lengkap,
          email,
          nomor_whatsapp,
          instansi,
          jurusan,
          divisi,
          status_magang,
          tanggal_mulai,
          tanggal_selesai,
          nilai_final
        )
      `)
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      );


  if (
    options.alasan
  ) {
    query =
      query.eq(
        'alasan',
        options.alasan
      );
  }


  const exactRange =
    rentangBulan(
      options.bulan
    );


  if (
    exactRange
  ) {
    query =
      query
        .gte(
          'created_at',
          `${exactRange.mulai}T00:00:00`
        )
        .lt(
          'created_at',
          `${exactRange.selesai}T00:00:00`
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua' &&
    (
      !options.bulanNomor ||
      options.bulanNomor ===
        'Semua'
    )
  ) {
    query =
      query
        .gte(
          'created_at',
          `${options.tahun}-01-01T00:00:00`
        )
        .lt(
          'created_at',
          `${
            Number(
              options.tahun
            ) +
            1
          }-01-01T00:00:00`
        );
  }


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  let rows =
    (
      data ??
      []
    ).map(
      normalizeSuspension
    );


  if (
    options.divisi &&
    options.divisi !==
      'Semua'
  ) {
    rows =
      rows.filter(
        (row) =>
          row.divisi ===
          options.divisi
      );
  }


  if (
    options.statusMagang &&
    options.statusMagang !==
      'Semua'
  ) {
    rows =
      rows.filter(
        (row) =>
          row.status ===
          options.statusMagang
      );
  }


  rows =
    filterJurusan(
      rows,
      options.jurusan
    );


  rows =
    filterInstansi(
      rows,
      options.instansi
    );


  if (
    !exactRange
  ) {
    rows =
      filterCalendar(
        rows,
        'tanggal',
        {
          tahun:
            options.tahun,

          bulanNomor:
            options.bulanNomor,
        }
      );
  }


  return rows;
}


/* =========================================================
   PUBLIC DETAIL LOADER
========================================================= */

export async function loadStatistikDetail({
  kind,

  /*
    Exact month:
    YYYY-MM

    Dipakai ketika klik satu row/chart bulan.
  */
  bulan = null,

  /*
    Global calendar filter.
  */
  tahun = 'Semua',

  bulanNomor = 'Semua',

  divisi = 'Semua',

  instansi = null,

  jurusan = 'Semua',

  statusPendaftaran = 'Semua',

  statusMagang = 'Semua',

  alasan = null,
} = {}) {
  const options = {
    bulan,
    tahun,
    bulanNomor,
    divisi,
    instansi,
    jurusan,
    statusPendaftaran,
    statusMagang,
    alasan,
  };


  switch (
    kind
  ) {
    case DETAIL_KIND.PENDAFTAR:
      return loadApplications(
        options
      );


    case DETAIL_KIND.DITERIMA:
      return loadApplications(
        options,
        'Approved'
      );


    case DETAIL_KIND.PENDING:
      return loadApplications(
        options,
        'Pending'
      );


    case DETAIL_KIND.DITOLAK:
      return loadApplications(
        options,
        'Rejected'
      );


    case DETAIL_KIND.PESERTA:
      return loadInterns(
        options
      );


    case DETAIL_KIND.AKTIF:
      return loadInterns(
        options,
        'Active'
      );


    case DETAIL_KIND.SELESAI:
      return loadInterns(
        options,
        'Completed'
      );


    case DETAIL_KIND.NONAKTIF:
      return loadInterns(
        options,
        'Dropped'
      );


    case DETAIL_KIND.MULAI_MAGANG:
      return loadInterns(
        options,
        null,
        'tanggal_mulai'
      );


    case DETAIL_KIND.PENONAKTIFAN:
      return loadSuspensions(
        options
      );


    case DETAIL_KIND.DIVISI:
      return loadInterns(
        options
      );


    case DETAIL_KIND.INSTANSI:
      return loadApplications(
        options
      );


    case DETAIL_KIND.JURUSAN:
      return loadInterns(
        options
      );


    default:
      throw new Error(
        `Jenis detail statistik tidak dikenal: ${kind}`
      );
  }
}


/* =========================================================
   LOCAL SEARCH
========================================================= */

export function filterStatistikRows(
  rows,
  keyword
) {
  const kata =
    String(
      keyword ??
      ''
    )
      .trim()
      .toLowerCase();


  if (!kata) {
    return rows;
  }


  return rows.filter(
    (row) =>
      [
        row.nama,
        row.email,
        row.whatsapp,
        row.instansi,
        row.jurusan,
        row.divisi,
        row.status,
        row.alasan,
      ]
        .filter(
          Boolean
        )
        .some(
          (value) =>
            String(
              value
            )
              .toLowerCase()
              .includes(
                kata
              )
        )
  );
}