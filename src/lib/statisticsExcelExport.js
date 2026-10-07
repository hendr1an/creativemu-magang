import {
  supabase,
} from './supabaseClient';


/* =========================================================
   CONSTANTS
========================================================= */

const TIME_ZONE =
  'Asia/Jakarta';


const STATUS_MAGANG_LABEL = {
  Active:
    'Aktif',

  Completed:
    'Selesai',

  Dropped:
    'Nonaktif',
};


const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];


/* =========================================================
   HELPERS
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


function normalizeJurusan(
  value
) {
  if (
    value === null ||
    value === undefined ||
    String(
      value
    ).trim() ===
      ''
  ) {
    return 'belum diisi';
  }


  return normalizeText(
    value
  );
}


function safeText(
  value,
  fallback = '-'
) {
  if (
    value === null ||
    value === undefined ||
    String(
      value
    ).trim() ===
      ''
  ) {
    return fallback;
  }


  /*
    Proteksi formula injection Excel.

    Data yang dimulai dengan:
    =
    +
    -
    @

    dapat dianggap formula oleh Excel.

    Kita paksa menjadi teks.
  */
  const text =
    String(
      value
    ).trim();


  if (
    /^[=+\-@]/.test(
      text
    )
  ) {
    return `'${text}`;
  }


  return text;
}


function formatDate(
  value
) {
  if (!value) {
    return '-';
  }


  const raw =
    String(
      value
    );


  /*
    PostgreSQL DATE.
    Jangan diputar timezone.
  */
  const dateOnly =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (
    dateOnly
  ) {
    const [
      ,
      year,
      month,
      day,
    ] =
      dateOnly;


    return `${day}/${month}/${year}`;
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
    return '-';
  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      timeZone:
        TIME_ZONE,
    }
  ).format(
    date
  );
}


function formatGeneratedAt() {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle:
        'long',

      timeStyle:
        'short',

      timeZone:
        TIME_ZONE,
    }
  ).format(
    new Date()
  );
}


function filenameDate() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        timeZone:
          TIME_ZONE,
      }
    )
      .formatToParts(
        new Date()
      );


  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'year'
    )?.value;


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'month'
    )?.value;


  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'day'
    )?.value;


  return `${year}-${month}-${day}`;
}


function getCalendarParts(
  value
) {
  if (!value) {
    return null;
  }


  const raw =
    String(
      value
    );


  const dateOnly =
    raw.match(
      /^(\d{4})-(\d{2})-\d{2}$/
    );


  if (
    dateOnly
  ) {
    return {
      year:
        Number(
          dateOnly[
            1
          ]
        ),

      month:
        Number(
          dateOnly[
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
        year:
          'numeric',

        month:
          '2-digit',

        timeZone:
          TIME_ZONE,
      }
    ).formatToParts(
      date
    );


  return {
    year:
      Number(
        parts.find(
          (
            part
          ) =>
            part.type ===
            'year'
        )?.value
      ),

    month:
      Number(
        parts.find(
          (
            part
          ) =>
            part.type ===
            'month'
        )?.value
      ),
  };
}


function statusMagangLabel(
  value
) {
  return (
    STATUS_MAGANG_LABEL[
      value
    ] ??
    safeText(
      value
    )
  );
}


/* =========================================================
   GLOBAL FILTER NORMALIZER
========================================================= */

function normalizeFilters(
  filters = {}
) {
  return {
    tahun:
      filters.tahun &&
      filters.tahun !==
        'Semua'
        ? Number(
            filters.tahun
          )
        : null,

    bulan:
      filters.bulan &&
      filters.bulan !==
        'Semua'
        ? Number(
            filters.bulan
          )
        : null,

    divisi:
      filters.divisi &&
      filters.divisi !==
        'Semua'
        ? filters.divisi
        : null,

    jurusan:
      filters.jurusan &&
      filters.jurusan !==
        'Semua'
        ? filters.jurusan
        : null,

    statusMagang:
      filters.statusMagang &&
      filters.statusMagang !==
        'Semua'
        ? filters.statusMagang
        : null,
  };
}


/* =========================================================
   FETCH SAFE INTERN DATA

   PENTING:
   Kita TIDAK melakukan select("*").

   Ini adalah whitelist keamanan export.
========================================================= */

async function fetchInternsForExport(
  filters
) {
  const normalized =
    normalizeFilters(
      filters
    );


  let query =
    supabase
      .from(
        'interns'
      )
      .select(`
        nama_lengkap,
        instansi,
        jurusan,
        divisi,
        status_magang,
        tanggal_mulai,
        tanggal_selesai,
        nilai_final
      `)
      .order(
        'nama_lengkap',
        {
          ascending:
            true,
        }
      );


  if (
    normalized.divisi
  ) {
    query =
      query.eq(
        'divisi',
        normalized.divisi
      );
  }


  if (
    normalized.statusMagang
  ) {
    query =
      query.eq(
        'status_magang',
        normalized.statusMagang
      );
  }


  /*
    Tahun tanpa filter Bulan dapat
    disaring server-side menggunakan
    tanggal_mulai.
  */
  if (
    normalized.tahun &&
    !normalized.bulan
  ) {
    query =
      query
        .gte(
          'tanggal_mulai',
          `${normalized.tahun}-01-01`
        )
        .lt(
          'tanggal_mulai',
          `${
            normalized.tahun +
            1
          }-01-01`
        );
  }


  /*
    Tahun + Bulan juga bisa langsung
    dipersempit di database.
  */
  if (
    normalized.tahun &&
    normalized.bulan
  ) {
    const start =
      new Date(
        Date.UTC(
          normalized.tahun,
          normalized.bulan -
            1,
          1
        )
      );


    const end =
      new Date(
        Date.UTC(
          normalized.tahun,
          normalized.bulan,
          1
        )
      );


    query =
      query
        .gte(
          'tanggal_mulai',
          start
            .toISOString()
            .slice(
              0,
              10
            )
        )
        .lt(
          'tanggal_mulai',
          end
            .toISOString()
            .slice(
              0,
              10
            )
        );
  }


  const {
    data,
    error,
  } =
    await query;


  if (
    error
  ) {
    throw error;
  }


  let rows =
    data ??
    [];


  /*
    Kasus:
    Bulan dipilih tetapi Tahun = Semua.

    Contoh:
      Bulan = September
      Tahun = Semua

    Supabase query biasa tidak nyaman
    untuk EXTRACT(MONTH), jadi kita
    samakan dengan semantics explorer:
    filter kalender dilakukan client-side.
  */
  if (
    !normalized.tahun &&
    normalized.bulan
  ) {
    rows =
      rows.filter(
        (
          row
        ) => {
          const parts =
            getCalendarParts(
              row.tanggal_mulai
            );


          return (
            parts?.month ===
            normalized.bulan
          );
        }
      );
  }


  /*
    Jurusan RPC statistik menggunakan
    normalisasi case-insensitive +
    whitespace normalization.

    Export memakai aturan sama.
  */
  if (
    normalized.jurusan
  ) {
    const target =
      normalizeJurusan(
        normalized.jurusan
      );


    rows =
      rows.filter(
        (
          row
        ) =>
          normalizeJurusan(
            row.jurusan
          ) ===
          target
      );
  }


  return rows;
}


/* =========================================================
   FILTER DESCRIPTION
========================================================= */

function filterDescription(
  filters
) {
  const normalized =
    normalizeFilters(
      filters
    );


  return [
    [
      'Tahun',
      normalized.tahun ??
        'Semua Tahun',
    ],

    [
      'Bulan',
      normalized.bulan
        ? MONTH_NAMES[
            normalized.bulan -
              1
          ]
        : 'Semua Bulan',
    ],

    [
      'Divisi',
      normalized.divisi ??
        'Semua Divisi',
    ],

    [
      'Jurusan / Program Studi',
      normalized.jurusan ??
        'Semua Jurusan',
    ],

    [
      'Status Magang',
      normalized.statusMagang
        ? statusMagangLabel(
            normalized.statusMagang
          )
        : 'Semua Status',
    ],
  ];
}


/* =========================================================
   EXCEL STYLE HELPERS
========================================================= */

function applyThinBorder(
  cell
) {
  cell.border = {
    top: {
      style:
        'thin',

      color: {
        argb:
          'FFE2E8F0',
      },
    },

    left: {
      style:
        'thin',

      color: {
        argb:
          'FFE2E8F0',
      },
    },

    bottom: {
      style:
        'thin',

      color: {
        argb:
          'FFE2E8F0',
      },
    },

    right: {
      style:
        'thin',

      color: {
        argb:
          'FFE2E8F0',
      },
    },
  };
}


function styleHeaderRow(
  row
) {
  row.height =
    24;


  row.eachCell(
    (
      cell
    ) => {
      cell.font = {
        bold:
          true,

        color: {
          argb:
            'FFFFFFFF',
        },

        size:
          10,
      };


      cell.fill = {
        type:
          'pattern',

        pattern:
          'solid',

        fgColor: {
          argb:
            'FF4F46E5',
        },
      };


      cell.alignment = {
        vertical:
          'middle',

        horizontal:
          'center',

        wrapText:
          true,
      };


      applyThinBorder(
        cell
      );
    }
  );
}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadBuffer(
  buffer,
  filename
) {
  const blob =
    new Blob(
      [
        buffer,
      ],
      {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      'a'
    );


  anchor.href =
    url;


  anchor.download =
    filename;


  document.body.appendChild(
    anchor
  );


  anchor.click();


  anchor.remove();


  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    1000
  );
}


/* =========================================================
   PUBLIC EXPORT
========================================================= */

export async function exportDataAnakMagang({
  filters = {},
} = {}) {
  /*
    Dynamic import:
    ExcelJS hanya dimuat ketika admin
    menekan tombol export.
  */
  const ExcelJSModule =
    await import(
      'exceljs'
    );


  const ExcelJS =
    ExcelJSModule.default ??
    ExcelJSModule;


  const rows =
    await fetchInternsForExport(
      filters
    );


  const workbook =
    new ExcelJS.Workbook();


  workbook.creator =
    'Creativemu Academy';


  workbook.lastModifiedBy =
    'Creativemu Academy';


  workbook.created =
    new Date();


  workbook.modified =
    new Date();


  workbook.subject =
    'Data Anak Magang Creativemu';


  workbook.title =
    'Data Anak Magang';


  workbook.company =
    'Creativemu Academy';


  /* =======================================================
     SHEET
  ======================================================= */

  const sheet =
    workbook.addWorksheet(
      'Data Anak Magang',
      {
        views: [
          {
            state:
              'frozen',

            ySplit:
              8,
          },
        ],
      }
    );


  /*
    Tidak ada:
    - id
    - application_id
    - profile_id
    - user_id
    - auth UUID
    - password_tercatat
    - token
    - metadata auth
    - suspension internal metadata

    Hanya whitelist operasional di bawah.
  */

  sheet.columns = [
    {
      key:
        'no',

      width:
        7,
    },

    {
      key:
        'nama',

      width:
        28,
    },

    {
      key:
        'instansi',

      width:
        34,
    },

    {
      key:
        'jurusan',

      width:
        32,
    },

    {
      key:
        'divisi',

      width:
        20,
    },

    {
      key:
        'status',

      width:
        16,
    },

    {
      key:
        'tanggal_mulai',

      width:
        17,
    },

    {
      key:
        'tanggal_selesai',

      width:
        17,
    },

    {
      key:
        'nilai_final',

      width:
        15,
    },
  ];


  /* =======================================================
     TITLE
  ======================================================= */

  sheet.mergeCells(
    'A1:I1'
  );


  const titleCell =
    sheet.getCell(
      'A1'
    );


  titleCell.value =
    'DATA ANAK MAGANG — CREATIVEMU ACADEMY';


  titleCell.font = {
    bold:
      true,

    size:
      16,

    color: {
      argb:
        'FFFFFFFF',
    },
  };


  titleCell.fill = {
    type:
      'pattern',

    pattern:
      'solid',

    fgColor: {
      argb:
        'FF4F46E5',
    },
  };


  titleCell.alignment = {
    vertical:
      'middle',

    horizontal:
      'left',
  };


  sheet.getRow(
    1
  ).height =
    30;


  /* =======================================================
     METADATA
  ======================================================= */

  sheet.mergeCells(
    'A2:I2'
  );


  sheet.getCell(
    'A2'
  ).value =
    `Diexport: ${formatGeneratedAt()}`;


  sheet.getCell(
    'A2'
  ).font = {
    italic:
      true,

    color: {
      argb:
        'FF64748B',
    },

    size:
      9,
  };


  sheet.mergeCells(
    'A3:I3'
  );


  sheet.getCell(
    'A3'
  ).value =
    `Total data: ${rows.length} peserta`;


  sheet.getCell(
    'A3'
  ).font = {
    bold:
      true,

    color: {
      argb:
        'FF334155',
    },

    size:
      10,
  };


  /* =======================================================
     ACTIVE FILTERS
  ======================================================= */

  const filterRows =
    filterDescription(
      filters
    );


  sheet.mergeCells(
    'A4:I4'
  );


  sheet.getCell(
    'A4'
  ).value =
    'FILTER YANG DIGUNAKAN';


  sheet.getCell(
    'A4'
  ).font = {
    bold:
      true,

    color: {
      argb:
        'FF4338CA',
    },

    size:
      9,
  };


  sheet.getCell(
    'A4'
  ).fill = {
    type:
      'pattern',

    pattern:
      'solid',

    fgColor: {
      argb:
        'FFEEF2FF',
    },
  };


  /*
    Supaya metadata tetap ringkas,
    filter ditulis dua kolom per baris.
  */

  const filterText =
    filterRows
      .map(
        (
          [
            label,
            value,
          ]
        ) =>
          `${label}: ${value}`
      )
      .join(
        '   |   '
      );


  sheet.mergeCells(
    'A5:I5'
  );


  sheet.getCell(
    'A5'
  ).value =
    filterText;


  sheet.getCell(
    'A5'
  ).alignment = {
    wrapText:
      true,

    vertical:
      'middle',
  };


  sheet.getCell(
    'A5'
  ).font = {
    size:
      9,

    color: {
      argb:
        'FF475569',
    },
  };


  sheet.getRow(
    5
  ).height =
    32;


  /* =======================================================
     PRIVACY NOTE
  ======================================================= */

  sheet.mergeCells(
    'A6:I6'
  );


  sheet.getCell(
    'A6'
  ).value =
    'Catatan privasi: file ini hanya memuat data operasional magang yang telah ditentukan. Kredensial, password, token autentikasi, UUID autentikasi, dan metadata internal tidak diexport.';


  sheet.getCell(
    'A6'
  ).font = {
    italic:
      true,

    size:
      8,

    color: {
      argb:
        'FF64748B',
    },
  };


  sheet.getCell(
    'A6'
  ).alignment = {
    wrapText:
      true,

    vertical:
      'middle',
  };


  sheet.getRow(
    6
  ).height =
    30;


  /* =======================================================
     TABLE HEADER
  ======================================================= */

  const headerRow =
    sheet.getRow(
      8
    );


  headerRow.values = [
    'No.',
    'Nama Peserta',
    'Instansi',
    'Jurusan / Program Studi',
    'Divisi',
    'Status Magang',
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Nilai Final',
  ];


  styleHeaderRow(
    headerRow
  );


  /* =======================================================
     DATA
  ======================================================= */

  rows.forEach(
    (
      intern,
      index
    ) => {
      const excelRow =
        sheet.getRow(
          index +
            9
        );


      excelRow.values = [
        index +
          1,

        safeText(
          intern.nama_lengkap
        ),

        safeText(
          intern.instansi
        ),

        safeText(
          intern.jurusan,
          'Belum diisi'
        ),

        safeText(
          intern.divisi
        ),

        statusMagangLabel(
          intern.status_magang
        ),

        formatDate(
          intern.tanggal_mulai
        ),

        formatDate(
          intern.tanggal_selesai
        ),

        intern.nilai_final ===
          null ||
        intern.nilai_final ===
          undefined
          ? '-'
          : Number(
              intern.nilai_final
            ),
      ];


      excelRow.height =
        22;


      excelRow.eachCell(
        {
          includeEmpty:
            true,
        },
        (
          cell,
          columnNumber
        ) => {
          applyThinBorder(
            cell
          );


          cell.alignment = {
            vertical:
              'middle',

            horizontal:
              [
                1,
                6,
                7,
                8,
                9,
              ].includes(
                columnNumber
              )
                ? 'center'
                : 'left',

            wrapText:
              true,
          };


          cell.font = {
            size:
              9,

            color: {
              argb:
                'FF334155',
            },
          };


          if (
            index %
              2 ===
            1
          ) {
            cell.fill = {
              type:
                'pattern',

              pattern:
                'solid',

              fgColor: {
                argb:
                  'FFF8FAFC',
              },
            };
          }
        }
      );


      /*
        Nilai Final berupa angka sungguhan,
        bukan string, supaya Excel bisa
        sort/filter numerik.
      */
      const nilaiCell =
        excelRow.getCell(
          9
        );


      if (
        typeof nilaiCell.value ===
        'number'
      ) {
        nilaiCell.numFmt =
          '0.00';
      }
    }
  );


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (
    rows.length ===
    0
  ) {
    sheet.mergeCells(
      'A9:I11'
    );


    const emptyCell =
      sheet.getCell(
        'A9'
      );


    emptyCell.value =
      'Tidak ada peserta yang sesuai dengan Filter Statistik aktif.';


    emptyCell.alignment = {
      vertical:
        'middle',

      horizontal:
        'center',
    };


    emptyCell.font = {
      italic:
        true,

      color: {
        argb:
          'FF94A3B8',
      },
    };
  }


  /* =======================================================
     EXCEL AUTO FILTER
  ======================================================= */

  if (
    rows.length >
    0
  ) {
    sheet.autoFilter = {
      from:
        'A8',

      to:
        `I${
          rows.length +
          8
        }`,
    };
  }


  /* =======================================================
     PRINT SETTINGS
  ======================================================= */

  sheet.pageSetup = {
    orientation:
      'landscape',

    fitToPage:
      true,

    fitToWidth:
      1,

    fitToHeight:
      0,

    margins: {
      left:
        0.3,

      right:
        0.3,

      top:
        0.5,

      bottom:
        0.5,

      header:
        0.2,

      footer:
        0.2,
    },
  };


  sheet.headerFooter.oddFooter =
    '&LCreativemu Academy&CData Anak Magang&RHalaman &P dari &N';


  /* =======================================================
     GENERATE FILE
  ======================================================= */

  const buffer =
    await workbook.xlsx.writeBuffer();


  const filename =
    `Data_Anak_Magang_Creativemu_${filenameDate()}.xlsx`;


  downloadBuffer(
    buffer,
    filename
  );


  return {
    filename,

    total:
      rows.length,
  };
}