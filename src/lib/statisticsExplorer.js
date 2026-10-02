import {
  supabase,
} from './supabaseClient';


/* =========================================================
   CONSTANTS
========================================================= */

export const DETAIL_KIND = {
  PENDAFTAR:
    'pendaftar',

  DITERIMA:
    'diterima',

  PENDING:
    'pending',

  DITOLAK:
    'ditolak',

  PESERTA:
    'peserta',

  AKTIF:
    'aktif',

  SELESAI:
    'selesai',

  NONAKTIF:
    'nonaktif',

  MULAI_MAGANG:
    'mulai_magang',

  DIVISI:
    'divisi',

  INSTANSI:
    'instansi',

  PENONAKTIFAN:
    'penonaktifan',
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
    'Peserta / Pendaftar Divisi',

  instansi:
    'Data Instansi',

  penonaktifan:
    'Riwayat Penonaktifan',
};


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
        nomorBulan -
          1,
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
      day:
        'numeric',

      month:
        'short',

      year:
        'numeric',

      timeZone:
        'Asia/Jakarta',
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
   NORMALIZER
========================================================= */

function normalizeApplication(
  row
) {
  return {
    id:
      row.id,

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
    id:
      row.id,

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
   FILTER QUERY HELPERS
========================================================= */

function applyApplicationFilters(
  query,
  options
) {
  let q =
    query;


  if (
    options.divisi &&
    options.divisi !==
      'Semua'
  ) {
    q =
      q.eq(
        'divisi',
        options.divisi
      );
  }


  if (
    options.instansi
  ) {
    q =
      q.eq(
        'instansi',
        options.instansi
      );
  }


  const range =
    rentangBulan(
      options.bulan
    );


  if (range) {
    q =
      q
        .gte(
          'created_at',
          `${range.mulai}T00:00:00`
        )
        .lt(
          'created_at',
          `${range.selesai}T00:00:00`
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua'
  ) {
    q =
      q
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


  return q;
}


function applyInternFilters(
  query,
  options,
  dateColumn =
    'created_at'
) {
  let q =
    query;


  if (
    options.divisi &&
    options.divisi !==
      'Semua'
  ) {
    q =
      q.eq(
        'divisi',
        options.divisi
      );
  }


  if (
    options.instansi
  ) {
    q =
      q.eq(
        'instansi',
        options.instansi
      );
  }


  const range =
    rentangBulan(
      options.bulan
    );


  if (range) {
    q =
      q
        .gte(
          dateColumn,
          range.mulai
        )
        .lt(
          dateColumn,
          range.selesai
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua'
  ) {
    q =
      q
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


  return q;
}


/* =========================================================
   APPLICATION DETAIL
========================================================= */

async function loadApplications(
  options,
  status =
    null
) {
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


  if (status) {
    query =
      query.eq(
        'status_pendaftaran',
        status
      );
  }


  query =
    applyApplicationFilters(
      query,
      options
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ).map(
    normalizeApplication
  );
}


/* =========================================================
   INTERN DETAIL
========================================================= */

async function loadInterns(
  options,
  status =
    null,
  dateColumn =
    'created_at'
) {
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


  if (status) {
    query =
      query.eq(
        'status_magang',
        status
      );
  }


  query =
    applyInternFilters(
      query,
      options,
      dateColumn
    );


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ).map(
    normalizeIntern
  );
}


/* =========================================================
   SUSPENSION DETAIL
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


  const range =
    rentangBulan(
      options.bulan
    );


  if (range) {
    query =
      query
        .gte(
          'created_at',
          `${range.mulai}T00:00:00`
        )
        .lt(
          'created_at',
          `${range.selesai}T00:00:00`
        );
  } else if (
    options.tahun &&
    options.tahun !==
      'Semua'
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
        (
          row
        ) =>
          row.divisi ===
          options.divisi
      );
  }


  if (
    options.instansi
  ) {
    rows =
      rows.filter(
        (
          row
        ) =>
          row.instansi ===
          options.instansi
      );
  }


  return rows;
}


/* =========================================================
   PUBLIC DETAIL LOADER
========================================================= */

export async function loadStatistikDetail({
  kind,

  bulan =
    null,

  tahun =
    'Semua',

  divisi =
    'Semua',

  instansi =
    null,

  status =
    'Semua',

  alasan =
    null,
} = {}) {
  const options = {
    bulan,
    tahun,
    divisi,
    instansi,
    status,
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


    case DETAIL_KIND.DIVISI: {
      if (
        [
          'Pending',
          'Approved',
          'Rejected',
        ].includes(
          status
        )
      ) {
        return loadApplications(
          options,
          status
        );
      }


      if (
        [
          'Active',
          'Completed',
          'Dropped',
        ].includes(
          status
        )
      ) {
        return loadInterns(
          options,
          status
        );
      }


      return loadInterns(
        options
      );
    }


    case DETAIL_KIND.INSTANSI:
      return loadApplications(
        options,
        [
          'Pending',
          'Approved',
          'Rejected',
        ].includes(
          status
        )
          ? status
          : null
      );


    default:
      throw new Error(
        `Jenis detail statistik tidak dikenal: ${kind}`
      );
  }
}


/* =========================================================
   CLIENT SEARCH
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
    (
      row
    ) =>
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
        .filter(Boolean)
        .some(
          (
            value
          ) =>
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