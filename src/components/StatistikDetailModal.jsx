import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  ExternalLink,
  Search,
  X,
} from 'lucide-react';

import Modal from './Modal';

import {
  filterStatistikRows,
  tanggalStatistik,
  tanggalWaktuStatistik,
} from '../lib/statisticsExplorer';


function inisial(
  nama
) {
  if (!nama) {
    return '?';
  }


  return nama
    .split(' ')
    .filter(Boolean)
    .map(
      (
        bagian
      ) =>
        bagian[0]
    )
    .slice(
      0,
      2
    )
    .join('')
    .toUpperCase();
}


function badgeStatus(
  status
) {
  switch (
    status
  ) {
    case 'Approved':
    case 'Active':
    case 'Completed':
      return 'bg-green-50 text-green-700 ring-green-100';


    case 'Pending':
      return 'bg-amber-50 text-amber-700 ring-amber-100';


    case 'Rejected':
    case 'Dropped':
      return 'bg-red-50 text-red-600 ring-red-100';


    default:
      return 'bg-slate-50 text-slate-600 ring-slate-100';
  }
}


export default function StatistikDetailModal({
  open,

  onClose,

  title,

  subtitle,

  rows =
    [],

  loading =
    false,

  error =
    null,
}) {
  const [
    keyword,
    setKeyword,
  ] =
    useState(
      ''
    );


  useEffect(
    () => {
      if (!open) {
        setKeyword(
          ''
        );
      }
    },
    [
      open,
    ]
  );


  const hasil =
    useMemo(
      () =>
        filterStatistikRows(
          rows,
          keyword
        ),
      [
        rows,
        keyword,
      ]
    );


  return (
    <Modal
      open={
        open
      }
      onClose={
        onClose
      }
      title={
        title ??
        'Detail Statistik'
      }
    >
      <div className="min-w-0">

        {/* ===============================================
            HEADER DETAIL
        =============================================== */}

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-400">
            Statistik Explorer
          </p>


          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {subtitle ??
                  title}
              </p>


              <p className="mt-1 text-xs text-slate-500">
                Klik peserta untuk
                membuka detail
                administrasi.
              </p>
            </div>


            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              {
                rows.length
              }{' '}
              data
            </span>
          </div>
        </div>


        {/* ===============================================
            SEARCH
        =============================================== */}

        {!loading &&
          !error &&
          rows.length >
            0 && (
            <div className="relative mt-3">
              <Search
                size={
                  15
                }
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                value={
                  keyword
                }
                onChange={(
                  e
                ) =>
                  setKeyword(
                    e.target.value
                  )
                }
                placeholder="Cari nama, email, instansi, jurusan, divisi…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />


              {keyword && (
                <button
                  type="button"
                  onClick={() =>
                    setKeyword(
                      ''
                    )
                  }
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X
                    size={
                      13
                    }
                  />
                </button>
              )}
            </div>
          )}


        {/* ===============================================
            LOADING
        =============================================== */}

        {loading ? (
          <div className="mt-4 space-y-2">
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
                  className="skeleton h-24 rounded-xl"
                />
              )
            )}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold text-red-700">
              ⚠️ Detail statistik
              gagal dimuat
            </p>


            <p className="mt-1 break-words text-xs leading-relaxed text-red-600">
              {
                error
              }
            </p>
          </div>
        ) : rows.length ===
          0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
            <p className="text-4xl">
              📭
            </p>


            <p className="mt-3 text-sm font-bold text-slate-600">
              Tidak Ada Data
            </p>


            <p className="mt-1 text-xs text-slate-400">
              Tidak ditemukan data
              untuk statistik yang
              dipilih.
            </p>
          </div>
        ) : hasil.length ===
          0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 py-8 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Tidak ditemukan hasil
              untuk "
              {
                keyword
              }
              "
            </p>
          </div>
        ) : (
          <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">

            {hasil.map(
              (
                row,
                index
              ) => {
                const internId =
                  row.source ===
                  'intern'
                    ? row.sourceId
                    : row.internId;


                return (
                  <div
                    key={`${row.source}-${row.id}`}
                    className="anim-in rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-indigo-100 hover:shadow-md"
                    style={{
                      animationDelay:
                        `${Math.min(
                          index,
                          8
                        ) * 35}ms`,
                    }}
                  >
                    <div className="flex items-start gap-3">

                      {/* AVATAR */}

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-extrabold text-white">
                        {inisial(
                          row.nama
                        )}
                      </span>


                      <div className="min-w-0 flex-1">

                        {/* NAME + STATUS */}

                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {
                                row.nama
                              }
                            </p>


                            <p className="mt-0.5 truncate text-[10px] text-slate-400">
                              {row.email ??
                                'Email tidak tersedia'}
                            </p>
                          </div>


                          {row.status && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ring-1 ${badgeStatus(
                                row.status
                              )}`}
                            >
                              {
                                row.status
                              }
                            </span>
                          )}
                        </div>


                        {/* META */}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-600">
                            🧩{' '}

                            {row.divisi ??
                              'Divisi belum diatur'}
                          </span>


                          {row.instansi && (
                            <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">
                              🏫{' '}

                              {
                                row.instansi
                              }
                            </span>
                          )}


                          <span
                            className={`max-w-full truncate rounded-full px-2 py-1 text-[9px] font-semibold ${
                              row.jurusan
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            🎓{' '}

                            {row.jurusan ??
                              'Jurusan belum diisi'}
                          </span>
                        </div>


                        {/* DATES */}

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-medium text-slate-400">
                          {row.source ===
                          'application' ? (
                            <>
                              <span>
                                📨 Mendaftar:{' '}

                                {tanggalWaktuStatistik(
                                  row.tanggal
                                )}
                              </span>


                              {row.tanggalMulai && (
                                <span>
                                  📅 Mulai:{' '}

                                  {tanggalStatistik(
                                    row.tanggalMulai
                                  )}
                                </span>
                              )}
                            </>
                          ) : row.source ===
                            'suspension' ? (
                            <span className="font-semibold text-red-500">
                              🔴 Dinonaktifkan:{' '}

                              {tanggalWaktuStatistik(
                                row.tanggal
                              )}
                            </span>
                          ) : (
                            <>
                              {row.tanggalMulai && (
                                <span>
                                  📅{' '}

                                  {tanggalStatistik(
                                    row.tanggalMulai
                                  )}

                                  {row.tanggalSelesai &&
                                    ` – ${tanggalStatistik(
                                      row.tanggalSelesai
                                    )}`}
                                </span>
                              )}


                              {row.nilai !=
                                null && (
                                <span>
                                  ⭐{' '}

                                  {
                                    row.nilai
                                  }
                                </span>
                              )}
                            </>
                          )}
                        </div>


                        {/* SUSPENSION REASON */}

                        {row.source ===
                          'suspension' &&
                          row.alasan && (
                            <div className="mt-2 rounded-lg bg-red-50 px-2.5 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-red-400">
                                Alasan
                              </p>


                              <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-red-600">
                                {
                                  row.alasan
                                }
                              </p>
                            </div>
                          )}


                        {/* DETAIL LINK */}

                        {internId && (
                          <Link
                            to={`/admin/peserta/${internId}`}
                            onClick={
                              onClose
                            }
                            className="btn-press mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-100"
                          >
                            Detail Peserta

                            <ExternalLink
                              size={
                                11
                              }
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}


        {/* ===============================================
            FOOTER COUNT
        =============================================== */}

        {!loading &&
          !error &&
          rows.length >
            0 && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-400">
              <span>
                Menampilkan{' '}

                <b className="text-slate-600">
                  {
                    hasil.length
                  }
                </b>{' '}

                dari{' '}

                <b className="text-slate-600">
                  {
                    rows.length
                  }
                </b>{' '}

                data
              </span>


              {keyword && (
                <span>
                  Filter lokal aktif
                </span>
              )}
            </div>
          )}
      </div>
    </Modal>
  );
}