import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Search,
  X,
} from 'lucide-react';

import {
  createPortal,
} from 'react-dom';

import {
  useNavigate,
} from 'react-router-dom';

import {
  filterStatistikRows,
  tanggalStatistik,
} from '../lib/statisticsExplorer';


function initialName(
  name
) {
  const parts =
    String(
      name ?? ''
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (
    parts.length === 0
  ) {
    return '?';
  }


  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }


  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}


function statusStyle(
  status
) {
  switch (
    status
  ) {
    case 'Approved':
    case 'Active':
      return 'border-green-100 bg-green-50 text-green-700';

    case 'Completed':
      return 'border-blue-100 bg-blue-50 text-blue-700';

    case 'Pending':
      return 'border-amber-100 bg-amber-50 text-amber-700';

    case 'Rejected':
    case 'Dropped':
      return 'border-red-100 bg-red-50 text-red-600';

    default:
      return 'border-slate-100 bg-slate-50 text-slate-600';
  }
}


function displayStatus(
  status
) {
  const labels = {
    Approved:
      'Approved',

    Pending:
      'Pending',

    Rejected:
      'Rejected',

    Active:
      'Aktif',

    Completed:
      'Selesai',

    Dropped:
      'Nonaktif',
  };


  return (
    labels[
      status
    ] ??
    status ??
    '—'
  );
}


function nilaiDisplay(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }


  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }


  return number.toFixed(
    2
  );
}


export default function StatistikDetailModal({
  open,

  onClose,

  title =
    'Detail Statistik',

  subtitle =
    '',

  rows =
    [],

  loading =
    false,

  error =
    null,
}) {
  const navigate =
    useNavigate();


  const [
    search,
    setSearch,
  ] =
    useState(
      ''
    );


  /*
    mounted:
    modal masih ada di DOM.

    closing:
    memainkan exit animation.
  */
  const [
    mounted,
    setMounted,
  ] =
    useState(
      open
    );


  const [
    closing,
    setClosing,
  ] =
    useState(
      false
    );


  /* =======================================================
     OPEN / CLOSE ANIMATION STATE
  ======================================================= */

  useEffect(
    () => {
      let timer;


      if (
        open
      ) {
        setMounted(
          true
        );

        setClosing(
          false
        );
      } else if (
        mounted
      ) {
        setClosing(
          true
        );


        timer =
          window.setTimeout(
            () => {
              setMounted(
                false
              );

              setClosing(
                false
              );
            },
            180
          );
      }


      return () => {
        if (
          timer
        ) {
          window.clearTimeout(
            timer
          );
        }
      };
    },
    [
      open,
      mounted,
    ]
  );


  /* =======================================================
     RESET SEARCH
  ======================================================= */

  useEffect(
    () => {
      if (
        open
      ) {
        setSearch(
          ''
        );
      }
    },
    [
      open,
      title,
    ]
  );


  /* =======================================================
     ESC + BODY SCROLL LOCK
  ======================================================= */

  useEffect(
    () => {
      if (
        !mounted
      ) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        'hidden';


      const handleKeyDown = (
        event
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          onClose?.();
        }
      };


      window.addEventListener(
        'keydown',
        handleKeyDown
      );


      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          'keydown',
          handleKeyDown
        );
      };
    },
    [
      mounted,
      onClose,
    ]
  );


  const filteredRows =
    useMemo(
      () =>
        filterStatistikRows(
          rows,
          search
        ),
      [
        rows,
        search,
      ]
    );


  if (
    !mounted
  ) {
    return null;
  }


  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={
        title
      }
    >

      {/* =================================================
          BACKDROP
      ================================================= */}

      <button
        type="button"
        aria-label="Tutup modal"
        onClick={
          onClose
        }
        className={`absolute inset-0 bg-slate-950/15 backdrop-blur-[1px] transition-opacity duration-[180ms] ${
          closing
            ? 'opacity-0'
            : 'opacity-100'
        }`}
      />


      {/* =================================================
          MODAL
      ================================================= */}

      <div
        className={`
          relative
          z-10
          flex
          w-full
          max-w-[520px]
          flex-col
          overflow-hidden
          rounded-[24px]
          border
          border-white/80
          bg-white
          shadow-[0_24px_80px_rgba(15,23,42,0.18)]
          ${
            closing
              ? 'animate-[statModalOut_180ms_ease-in_forwards]'
              : 'animate-[statModalIn_180ms_ease-out]'
          }
        `}
        style={{
          maxHeight:
            'calc(100dvh - 24px)',
        }}
      >

        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-slate-800">
              {
                title
              }
            </h2>

            {subtitle && (
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                {
                  subtitle
                }
              </p>
            )}
          </div>


          {/* =============================================
              ANIMATED CLOSE BUTTON
          ============================================= */}

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              group
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-slate-400
              transition-all
              duration-200
              hover:rotate-90
              hover:bg-red-50
              hover:text-red-500
              hover:scale-105
              active:rotate-90
              active:scale-90
            "
            aria-label="Tutup"
          >
            <X
              size={
                19
              }
              className="
                transition-transform
                duration-200
                group-hover:scale-110
              "
            />
          </button>
        </div>


        {/* ===============================================
            CONTENT
        =============================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

          {/* INFO CARD */}

          <div className="px-5 pt-4">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-indigo-400">
                    Statistik Explorer
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-slate-800">
                    Data mengikuti Filter Statistik aktif.
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    Klik peserta untuk membuka detail administrasi.
                  </p>
                </div>


                {!loading &&
                  !error && (
                  <span className="shrink-0 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[10px] font-extrabold text-indigo-600 shadow-sm">
                    {
                      rows.length
                    }{' '}
                    data
                  </span>
                )}
              </div>
            </div>
          </div>


          {/* SEARCH */}

          {!loading &&
            !error &&
            rows.length >
              0 && (
            <div className="sticky top-0 z-10 bg-white px-5 pb-3 pt-3">
              <div className="relative">
                <Search
                  size={
                    15
                  }
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Cari nama, email, instansi, jurusan, divisi..."
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    pl-10
                    pr-4
                    text-xs
                    font-medium
                    text-slate-700
                    outline-none
                    transition
                    focus:border-indigo-400
                    focus:ring-2
                    focus:ring-indigo-100
                  "
                />
              </div>
            </div>
          )}


          {/* ===============================================
              LOADING
          =============================================== */}

          {loading && (
            <div className="space-y-3 px-5 py-5">
              {Array.from({
                length:
                  4,
              }).map(
                (
                  _,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                )
              )}
            </div>
          )}


          {/* ===============================================
              ERROR
          =============================================== */}

          {!loading &&
            error && (
            <div className="px-5 py-8">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-center">
                <AlertCircle
                  size={
                    28
                  }
                  className="mx-auto text-red-400"
                />

                <p className="mt-3 text-sm font-extrabold text-red-700">
                  Gagal memuat data
                </p>

                <p className="mt-1 text-xs leading-relaxed text-red-500">
                  {
                    error
                  }
                </p>
              </div>
            </div>
          )}


          {/* ===============================================
              EMPTY
          =============================================== */}

          {!loading &&
            !error &&
            filteredRows.length ===
              0 && (
            <div className="px-5 py-8">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
                <p className="text-3xl">
                  📭
                </p>

                <p className="mt-3 text-sm font-extrabold text-slate-700">
                  Tidak Ada Data
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {search
                    ? 'Tidak ada data yang cocok dengan pencarian.'
                    : 'Tidak ditemukan data untuk statistik yang dipilih.'}
                </p>
              </div>
            </div>
          )}


          {/* ===============================================
              DATA LIST
          =============================================== */}

          {!loading &&
            !error &&
            filteredRows.length >
              0 && (
            <div className="space-y-2.5 px-5 pb-4">
              {filteredRows.map(
                (
                  row
                ) => {
                  const internId =
                    row.source ===
                      'intern'
                      ? row.id
                      : row.internId;


                  const clickable =
                    Boolean(
                      internId
                    );


                  const finalValue =
                    nilaiDisplay(
                      row.nilai
                    );


                  return (
                    <button
                      key={`${row.source}-${row.sourceId ?? row.id}`}
                      type="button"
                      disabled={
                        !clickable
                      }
                      onClick={() => {
                        if (
                          !clickable
                        ) {
                          return;
                        }


                        onClose?.();


                        window.setTimeout(
                          () => {
                            navigate(
                              `/admin/peserta/${internId}`
                            );
                          },
                          180
                        );
                      }}
                      className={`
                        group
                        w-full
                        rounded-2xl
                        border
                        border-slate-100
                        bg-white
                        p-3.5
                        text-left
                        shadow-sm
                        transition-all
                        duration-150
                        ${
                          clickable
                            ? 'hover:-translate-y-px hover:border-indigo-100 hover:shadow-md active:translate-y-0 active:scale-[0.995]'
                            : 'cursor-default'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-extrabold text-white shadow-sm">
                          {initialName(
                            row.nama
                          )}
                        </span>


                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-slate-800">
                                {
                                  row.nama ??
                                  'Tanpa Nama'
                                }
                              </p>

                              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                {
                                  row.email ??
                                  'Email tidak tersedia'
                                }
                              </p>
                            </div>


                            {row.status && (
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-extrabold ${statusStyle(
                                  row.status
                                )}`}
                              >
                                {displayStatus(
                                  row.status
                                )}
                              </span>
                            )}
                          </div>


                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.divisi && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[8px] font-bold text-indigo-600">
                                🧩

                                {
                                  row.divisi
                                }
                              </span>
                            )}


                            {row.instansi && (
                              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-500">
                                <Building2
                                  size={
                                    9
                                  }
                                />

                                <span className="truncate">
                                  {
                                    row.instansi
                                  }
                                </span>
                              </span>
                            )}


                            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[8px] font-bold text-purple-600">
                              <GraduationCap
                                size={
                                  9
                                }
                              />

                              <span className="truncate">
                                {row.jurusan ||
                                  'Belum diisi'}
                              </span>
                            </span>


                            {finalValue !==
                              null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">
                                ⭐ Nilai{' '}

                                {
                                  finalValue
                                }
                              </span>
                            )}
                          </div>


                          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[8px] font-medium text-slate-400">
                            {row.tanggal && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays
                                  size={
                                    10
                                  }
                                />

                                {row.source ===
                                'application'
                                  ? 'Mendaftar'
                                  : row.source ===
                                      'suspension'
                                    ? 'Nonaktif'
                                    : 'Data'}

                                :{' '}

                                {tanggalStatistik(
                                  row.tanggal
                                )}
                              </span>
                            )}


                            {row.tanggalMulai && (
                              <span className="inline-flex items-center gap-1">
                                🗓️ Mulai:{' '}

                                {tanggalStatistik(
                                  row.tanggalMulai
                                )}
                              </span>
                            )}
                          </div>


                          {row.alasan && (
                            <div className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[9px] leading-relaxed text-red-600">
                              <b>
                                Alasan:
                              </b>{' '}

                              {
                                row.alasan
                              }
                            </div>
                          )}
                        </div>


                        {clickable && (
                          <ChevronRight
                            size={
                              15
                            }
                            className="mt-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500"
                          />
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>


        {!loading &&
          !error &&
          rows.length >
            0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
            <p className="text-[9px] font-medium text-slate-400">
              Menampilkan{' '}

              <b className="text-slate-600">
                {
                  filteredRows.length
                }
              </b>{' '}

              dari{' '}

              <b className="text-slate-600">
                {
                  rows.length
                }
              </b>{' '}

              data
            </p>
          </div>
        )}
      </div>


      <style>
        {`
          @keyframes statModalIn {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.985);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes statModalOut {
            from {
              opacity: 1;
              transform: translateY(0) scale(1);
            }

            to {
              opacity: 0;
              transform: translateY(6px) scale(0.985);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            [class*="animate-[statModalIn"],
            [class*="animate-[statModalOut"] {
              animation: none !important;
            }
          }
        `}
      </style>
    </div>,

    document.body
  );
}