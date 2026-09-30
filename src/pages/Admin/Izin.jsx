import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  buatUrlFile,
} from '../../lib/api';

import {
  fmtTanggal,
} from '../../lib/format';


/* =========================================================
   CONSTANT
========================================================= */

const BADGE = {
  Pending:
    'bg-amber-400',

  Approved:
    'bg-emerald-500',

  Rejected:
    'bg-red-500',
};


const FILTERS = [
  'Pending',
  'Approved',
  'Rejected',
  'Semua',
];


function ikonJenis(
  jenis
) {
  if (
    jenis ===
    'Sakit'
  ) {
    return '🤒';
  }

  if (
    jenis ===
    'WFH'
  ) {
    return '🏠';
  }

  if (
    jenis ===
    'Terlambat'
  ) {
    return '⏰';
  }

  return '📝';
}


function labelJenis(
  jenis
) {
  if (
    jenis ===
    'Terlambat'
  ) {
    return 'Izin Telat';
  }

  return jenis;
}


/* =========================================================
   OVERLAP HELPER
========================================================= */

function isOverlap(
  a,
  b
) {
  if (
    !a ||
    !b
  ) {
    return false;
  }

  return (
    a.tanggal_mulai <=
      b.tanggal_selesai &&
    a.tanggal_selesai >=
      b.tanggal_mulai
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function Izin() {
  const {
    user,
  } =
    useAuth();


  /* =======================================================
     DATA
  ======================================================= */

  const [
    daftar,
    setDaftar,
  ] = useState([]);


  /*
    Semua izin aktif:
    Pending + Approved.

    Tidak mengikuti filter UI.
    Dipakai khusus conflict detection.
  */
  const [
    izinAktif,
    setIzinAktif,
  ] = useState([]);


  const [
    pulang,
    setPulang,
  ] = useState([]);


  const [
    filter,
    setFilter,
  ] = useState(
    'Pending'
  );


  const [
    catatan,
    setCatatan,
  ] = useState({});


  const [
    busyId,
    setBusyId,
  ] = useState(null);


  const [
    pesan,
    setPesan,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    muatSemua();
  }, [filter]);


  async function muatSemua() {
    setLoading(true);

    await Promise.all([
      muatIzin(),
      muatIzinAktif(),
      muatPulang(),
    ]);

    setLoading(false);
  }


  /*
    Data yang terlihat mengikuti filter.
  */
  async function muatIzin() {
    let q =
      supabase
        .from(
          'leave_requests'
        )
        .select(
          `
          *,
          interns(
            id,
            nama_lengkap,
            instansi
          )
          `
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );


    if (
      filter !==
      'Semua'
    ) {
      q =
        q.eq(
          'status_izin',
          filter
        );
    }


    const {
      data,
      error,
    } =
      await q;


    if (error) {
      setPesan({
        tipe: 'err',

        teks:
          error.message,
      });

      return;
    }


    setDaftar(
      data ?? []
    );
  }


  /*
    Data aktif tidak mengikuti filter.

    Semua Pending dan Approved dibaca agar halaman admin
    bisa mendeteksi overlap walaupun admin sedang melihat
    tab Pending saja.
  */
  async function muatIzinAktif() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'leave_requests'
        )
        .select(
          `
          id,
          intern_id,
          jenis_izin,
          tanggal_mulai,
          tanggal_selesai,
          status_izin,
          created_at
          `
        )
        .in(
          'status_izin',
          [
            'Pending',
            'Approved',
          ]
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );


    if (error) {
      setPesan({
        tipe: 'err',

        teks:
          error.message,
      });

      return;
    }


    setIzinAktif(
      data ?? []
    );
  }


  /*
    Pulang awal tetap mengikuti filter seperti sebelumnya.
  */
  async function muatPulang() {
    let q =
      supabase
        .from(
          'early_checkouts'
        )
        .select(
          `
          *,
          interns(
            nama_lengkap
          )
          `
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );


    if (
      filter !==
      'Semua'
    ) {
      q =
        q.eq(
          'status',
          filter
        );
    }


    const {
      data,
      error,
    } =
      await q;


    if (error) {
      setPesan({
        tipe: 'err',

        teks:
          error.message,
      });

      return;
    }


    setPulang(
      data ?? []
    );
  }


  /* =======================================================
     CONFLICT MAP
  ======================================================= */

  /*
    Untuk setiap leave_request yang tampil, cari semua izin
    aktif milik peserta yang sama dan periodenya overlap.

    Row sendiri tidak dihitung.
  */
  const conflictMap =
    useMemo(
      () => {
        const result =
          {};

        daftar.forEach(
          (row) => {
            result[
              row.id
            ] =
              izinAktif.filter(
                (lain) =>
                  lain.id !==
                    row.id &&
                  lain.intern_id ===
                    row.intern_id &&
                  isOverlap(
                    row,
                    lain
                  )
              );
          }
        );

        return result;
      },
      [
        daftar,
        izinAktif,
      ]
    );


  function getConflictInfo(
    row
  ) {
    const conflicts =
      conflictMap[
        row.id
      ] ?? [];


    const approved =
      conflicts.filter(
        (item) =>
          item.status_izin ===
          'Approved'
      );


    const pending =
      conflicts.filter(
        (item) =>
          item.status_izin ===
          'Pending'
      );


    return {
      all:
        conflicts,

      approved,

      pending,

      /*
        Hard conflict:
        sudah ada Approved lain.

        Approval pengajuan ini pasti ditolak DB trigger 029.
      */
      hardConflict:
        approved.length >
        0,

      /*
        Soft warning:
        hanya ada Pending lain.

        Admin masih boleh memilih satu untuk disetujui.
      */
      softConflict:
        approved.length ===
          0 &&
        pending.length >
          0,
    };
  }


  /* =======================================================
     PRE-CHECK SEBELUM APPROVE
  ======================================================= */

  async function cekApprovedConflict(
    row
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'leave_requests'
        )
        .select(
          `
          id,
          jenis_izin,
          tanggal_mulai,
          tanggal_selesai,
          status_izin
          `
        )
        .eq(
          'intern_id',
          row.intern_id
        )
        .eq(
          'status_izin',
          'Approved'
        )
        .neq(
          'id',
          row.id
        )
        .lte(
          'tanggal_mulai',
          row.tanggal_selesai
        )
        .gte(
          'tanggal_selesai',
          row.tanggal_mulai
        )
        .limit(1);


    if (error) {
      throw new Error(
        'Gagal memeriksa konflik izin: ' +
          error.message
      );
    }


    return (
      data?.[0] ??
      null
    );
  }


  /* =======================================================
     PROSES IZIN
  ======================================================= */

  async function prosesIzin(
    row,
    status
  ) {
    setBusyId(
      row.id
    );

    setPesan(
      null
    );


    try {
      /*
        Saat Approve lakukan pre-check baru,
        bukan hanya mengandalkan state yang mungkin sudah
        beberapa detik lama.
      */
      if (
        status ===
        'Approved'
      ) {
        const conflict =
          await cekApprovedConflict(
            row
          );


        if (conflict) {
          throw new Error(
            `Tidak dapat menyetujui pengajuan ini. ` +
              `${row.interns?.nama_lengkap ?? 'Peserta'} ` +
              `sudah memiliki ${labelJenis(
                conflict.jenis_izin
              )} berstatus Approved ` +
              `untuk periode ${fmtTanggal(
                conflict.tanggal_mulai
              )}` +
              `${
                conflict.tanggal_selesai !==
                conflict.tanggal_mulai
                  ? ` s.d. ${fmtTanggal(
                      conflict.tanggal_selesai
                    )}`
                  : ''
              }.`
          );
        }
      }


      const {
        error,
      } =
        await supabase
          .from(
            'leave_requests'
          )
          .update({
            status_izin:
              status,

            reviewed_by:
              user.id,

            catatan_reviewer:
              catatan[
                row.id
              ]?.trim() ||
              null,
          })
          .eq(
            'id',
            row.id
          );


      if (error) {
        /*
          Trigger 029 akan tetap menangkap race condition
          atau conflict yang tidak sempat terlihat frontend.
        */
        throw new Error(
          error.message
        );
      }


      let successText;


      if (
        status ===
        'Rejected'
      ) {
        successText =
          `❌ Pengajuan ${labelJenis(
            row.jenis_izin
          )} ${row.interns?.nama_lengkap ?? ''} ditolak.`;
      } else if (
        row.jenis_izin ===
          'WFH'
      ) {
        successText =
          `✅ WFH ${row.interns?.nama_lengkap ?? ''} disetujui — peserta dapat presensi tanpa batas lokasi pada periode tersebut.`;
      } else if (
        row.jenis_izin ===
          'Terlambat'
      ) {
        successText =
          `✅ Izin terlambat ${row.interns?.nama_lengkap ?? ''} disetujui — check-in tetap menggunakan lokasi kantor tanpa penalti keterlambatan.`;
      } else {
        successText =
          `✅ ${labelJenis(
            row.jenis_izin
          )} ${row.interns?.nama_lengkap ?? ''} disetujui — presensi tercatat otomatis.`;
      }


      setPesan({
        tipe: 'ok',

        teks:
          successText,
      });


      /*
        Hapus draft catatan untuk row yang sudah selesai.
      */
      setCatatan(
        (state) => {
          const next = {
            ...state,
          };

          delete next[
            row.id
          ];

          return next;
        }
      );


      /*
        Refresh dua sumber sekaligus agar conflict status
        langsung ikut berubah.

        Contoh:
        Pending A + Pending B.
        A diapprove.
        B langsung mendapat hard conflict.
      */
      await Promise.all([
        muatIzin(),
        muatIzinAktif(),
      ]);
    } catch (err) {
      setPesan({
        tipe: 'err',

        teks:
          err?.message ??
          'Pengajuan gagal diproses.',
      });


      /*
        Refresh juga ketika gagal karena bisa jadi state DB
        sudah berubah dari tab/browser admin lain.
      */
      await muatIzinAktif();
    } finally {
      setBusyId(
        null
      );
    }
  }


  /* =======================================================
     PROSES PULANG AWAL
  ======================================================= */

  async function prosesPulang(
    row,
    status
  ) {
    setBusyId(
      row.id
    );

    setPesan(
      null
    );


    const {
      error,
    } =
      await supabase
        .from(
          'early_checkouts'
        )
        .update({
          status,

          reviewed_by:
            user.id,

          reviewed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          row.id
        );


    if (error) {
      setPesan({
        tipe: 'err',

        teks:
          error.message,
      });
    } else {
      setPesan({
        tipe: 'ok',

        teks:
          status ===
          'Approved'
            ? `✅ Pulang awal ${row.interns?.nama_lengkap} disetujui — tombol check-out peserta terbuka.`
            : `❌ Pengajuan pulang awal ${row.interns?.nama_lengkap} ditolak.`,
      });


      await muatPulang();
    }


    setBusyId(
      null
    );
  }


  /* =======================================================
     BUKTI
  ======================================================= */

  async function lihatBukti(
    path
  ) {
    try {
      window.open(
        await buatUrlFile(
          path
        ),
        '_blank'
      );
    } catch (e) {
      setPesan({
        tipe: 'err',

        teks:
          e.message,
      });
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />

        <p className="text-sm text-slate-400">
          Memuat pengajuan...
        </p>
      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div>
      {/* HEADER */}

      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Persetujuan Izin
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Tinjau Izin,
          Sakit, WFH,
          Izin Telat, dan
          pengajuan pulang awal
          peserta.
        </p>
      </div>


      {/* GLOBAL INFO */}

      <div className="anim-up mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 [animation-delay:40ms]">
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={19}
            className="mt-0.5 shrink-0 text-indigo-600"
          />

          <div>
            <p className="text-xs font-extrabold text-indigo-700">
              Leave Conflict
              Guard aktif
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-indigo-600">
              Dalam periode
              yang saling
              bertabrakan hanya
              satu pengajuan yang
              dapat berstatus
              Approved. Sistem
              akan memberi
              peringatan dan
              database tetap
              menjadi pengaman
              terakhir.
            </p>
          </div>
        </div>
      </div>


      {/* MESSAGE */}

      {pesan && (
        <div
          className={`anim-down mt-4 flex items-start justify-between gap-3 rounded-xl border p-3 ${
            pesan.tipe ===
            'ok'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          <p className="text-sm font-medium leading-relaxed">
            {pesan.teks}
          </p>

          <button
            type="button"
            onClick={() =>
              setPesan(
                null
              )
            }
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}


      {/* FILTER */}

      <div className="anim-up mt-4 flex flex-wrap gap-2 [animation-delay:60ms]">
        {FILTERS.map(
          (f) => (
            <button
              key={
                f
              }
              type="button"
              onClick={() =>
                setFilter(
                  f
                )
              }
              className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filter ===
                f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {f}
            </button>
          )
        )}
      </div>


      {/* =================================================
          IZIN
      ================================================= */}

      <h2 className="anim-up mt-6 text-base font-bold text-slate-800 [animation-delay:100ms]">
        📝 Izin / Sakit /
        WFH / Izin Telat
      </h2>


      <div className="mt-3 space-y-3">
        {daftar.length ===
        0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="anim-float text-4xl">
              📭
            </p>

            <p className="mt-3 text-sm font-semibold text-slate-400">
              Tidak ada data
            </p>
          </div>
        ) : (
          daftar.map(
            (
              d,
              i
            ) => {
              const conflict =
                getConflictInfo(
                  d
                );


              return (
                <div
                  key={
                    d.id
                  }
                  className={`anim-up card-hover relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
                    conflict.hardConflict &&
                    d.status_izin ===
                      'Pending'
                      ? 'border-red-200'
                      : conflict.softConflict &&
                          d.status_izin ===
                            'Pending'
                        ? 'border-amber-200'
                        : 'border-slate-100'
                  }`}
                  style={{
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  {/* STATUS ACCENT */}

                  <div
                    className={`absolute inset-y-0 left-0 w-1.5 ${
                      BADGE[
                        d
                          .status_izin
                      ] ??
                      'bg-slate-300'
                    }`}
                  />


                  {/* MAIN INFO */}

                  <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                        {d.interns?.nama_lengkap
                          ?.split(
                            ' '
                          )
                          .map(
                            (
                              x
                            ) =>
                              x[0]
                          )
                          .slice(
                            0,
                            2
                          )
                          .join(
                            ''
                          )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-800">
                            {ikonJenis(
                              d.jenis_izin
                            )}{' '}

                            {labelJenis(
                              d.jenis_izin
                            )}{' '}

                            —{' '}

                            {
                              d
                                .interns
                                ?.nama_lengkap
                            }
                          </p>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white ${
                              BADGE[
                                d
                                  .status_izin
                              ] ??
                              'bg-slate-400'
                            }`}
                          >
                            {d.status_izin.toUpperCase()}
                          </span>


                          {/* CONFLICT BADGE */}

                          {d.status_izin ===
                            'Pending' &&
                            conflict.hardConflict && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-extrabold text-red-600">
                                <ShieldAlert
                                  size={
                                    10
                                  }
                                />

                                APPROVAL
                                CONFLICT
                              </span>
                            )}


                          {d.status_izin ===
                            'Pending' &&
                            conflict.softConflict && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-700">
                                <AlertTriangle
                                  size={
                                    10
                                  }
                                />

                                OVERLAP
                              </span>
                            )}
                        </div>


                        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                          {fmtTanggal(
                            d.tanggal_mulai
                          )}

                          {d.tanggal_selesai !==
                            d.tanggal_mulai &&
                            ` s.d. ${fmtTanggal(
                              d.tanggal_selesai
                            )}`}

                          {d.interns?.instansi &&
                            ` · 🏫 ${d.interns.instansi}`}
                        </p>


                        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500">
                          "
                          {
                            d.alasan
                          }
                          "
                        </p>
                      </div>
                    </div>


                    {d.bukti_url && (
                      <button
                        type="button"
                        onClick={() =>
                          lihatBukti(
                            d.bukti_url
                          )
                        }
                        className="btn-press shrink-0 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        📎 Lihat
                        Bukti
                      </button>
                    )}
                  </div>


                  {/* =================================================
                      HARD CONFLICT
                  ================================================= */}

                  {d.status_izin ===
                    'Pending' &&
                    conflict.hardConflict && (
                      <div className="anim-down mt-4 ml-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert
                            size={
                              18
                            }
                            className="mt-0.5 shrink-0 text-red-600"
                          />

                          <div>
                            <p className="text-xs font-extrabold text-red-700">
                              Pengajuan
                              ini tidak
                              dapat
                              disetujui
                            </p>

                            <p className="mt-1 text-[11px] leading-relaxed text-red-600">
                              Peserta
                              sudah
                              memiliki
                              pengajuan
                              Approved
                              yang
                              periodenya
                              bertabrakan:
                            </p>

                            <div className="mt-2 space-y-1">
                              {conflict.approved.map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-lg bg-white/80 px-3 py-2 text-[11px] text-red-700"
                                  >
                                    <b>
                                      {ikonJenis(
                                        item.jenis_izin
                                      )}{' '}

                                      {labelJenis(
                                        item.jenis_izin
                                      )}
                                    </b>

                                    {' · '}

                                    {fmtTanggal(
                                      item.tanggal_mulai
                                    )}

                                    {item.tanggal_selesai !==
                                      item.tanggal_mulai &&
                                      ` s.d. ${fmtTanggal(
                                        item.tanggal_selesai
                                      )}`}
                                  </div>
                                )
                              )}
                            </div>

                            <p className="mt-2 text-[10px] font-semibold text-red-500">
                              Pengajuan
                              ini masih
                              dapat
                              ditolak,
                              tetapi tidak
                              dapat
                              di-approve.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}


                  {/* =================================================
                      SOFT CONFLICT
                  ================================================= */}

                  {d.status_izin ===
                    'Pending' &&
                    conflict.softConflict && (
                      <div className="anim-down mt-4 ml-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle
                            size={
                              18
                            }
                            className="mt-0.5 shrink-0 text-amber-600"
                          />

                          <div>
                            <p className="text-xs font-extrabold text-amber-700">
                              Ada
                              pengajuan
                              Pending lain
                              yang overlap
                            </p>

                            <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                              Admin masih
                              boleh
                              menyetujui
                              pengajuan
                              ini. Jika
                              disetujui,
                              pengajuan
                              overlap
                              lainnya
                              tidak dapat
                              di-approve.
                            </p>

                            <div className="mt-2 space-y-1">
                              {conflict.pending.map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-lg bg-white/80 px-3 py-2 text-[11px] text-amber-700"
                                  >
                                    <b>
                                      {ikonJenis(
                                        item.jenis_izin
                                      )}{' '}

                                      {labelJenis(
                                        item.jenis_izin
                                      )}
                                    </b>

                                    {' · '}

                                    {fmtTanggal(
                                      item.tanggal_mulai
                                    )}

                                    {item.tanggal_selesai !==
                                      item.tanggal_mulai &&
                                      ` s.d. ${fmtTanggal(
                                        item.tanggal_selesai
                                      )}`}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}


                  {/* =================================================
                      ACTION
                  ================================================= */}

                  {d.status_izin ===
                    'Pending' && (
                    <div className="mt-4 flex flex-col gap-2 pl-3 sm:flex-row">
                      <input
                        value={
                          catatan[
                            d.id
                          ] ??
                          ''
                        }
                        onChange={(e) =>
                          setCatatan(
                            (
                              state
                            ) => ({
                              ...state,

                              [d.id]:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Catatan untuk peserta (opsional)…"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            prosesIzin(
                              d,
                              'Approved'
                            )
                          }
                          disabled={
                            busyId ===
                              d.id ||
                            conflict.hardConflict
                          }
                          title={
                            conflict.hardConflict
                              ? 'Sudah ada izin Approved yang overlap'
                              : 'Setujui pengajuan'
                          }
                          className={`btn-press flex flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md sm:flex-none ${
                            conflict.hardConflict
                              ? 'cursor-not-allowed bg-slate-300 shadow-none'
                              : 'bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600'
                          } disabled:opacity-60`}
                        >
                          {busyId ===
                          d.id ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <CheckCircle2
                              size={
                                14
                              }
                            />
                          )}

                          Setujui
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            prosesIzin(
                              d,
                              'Rejected'
                            )
                          }
                          disabled={
                            busyId ===
                            d.id
                          }
                          className="btn-press flex-1 rounded-xl bg-red-50 px-5 py-2.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 sm:flex-none"
                        >
                          ✕ Tolak
                        </button>
                      </div>
                    </div>
                  )}


                  {/* REVIEWER NOTE */}

                  {d.status_izin !==
                    'Pending' &&
                    d.catatan_reviewer && (
                      <p className="mt-3 ml-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        💬{' '}
                        {
                          d.catatan_reviewer
                        }
                      </p>
                    )}
                </div>
              );
            }
          )
        )}
      </div>


      {/* =================================================
          PULANG AWAL
      ================================================= */}

      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:200ms]">
        🏃 Pulang Awal
        (check-out &lt;
        17:00)

        <span className="ml-2 text-xs font-medium text-slate-400">
          — mengikuti filter
          di atas
        </span>
      </h2>


      <div className="mt-3 space-y-2">
        {pulang.length ===
        0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="anim-float text-4xl">
              🏃
            </p>

            <p className="mt-3 text-sm font-semibold text-slate-400">
              Tidak ada data
            </p>
          </div>
        ) : (
          pulang.map(
            (
              p,
              i
            ) => (
              <div
                key={
                  p.id
                }
                className="anim-up card-hover flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                style={{
                  animationDelay: `${i * 70}ms`,
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-xs font-bold text-white">
                    {p.interns?.nama_lengkap
                      ?.split(
                        ' '
                      )
                      .map(
                        (
                          x
                        ) =>
                          x[0]
                      )
                      .slice(
                        0,
                        2
                      )
                      .join(
                        ''
                      )}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {
                        p
                          .interns
                          ?.nama_lengkap
                      }
                    </p>

                    <p className="text-[11px] text-slate-400">
                      📅{' '}
                      {fmtTanggal(
                        p.tanggal
                      )}{' '}

                      · "
                      {
                        p.alasan
                      }
                      "
                    </p>
                  </div>
                </div>


                {p.status ===
                'Pending' ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        prosesPulang(
                          p,
                          'Approved'
                        )
                      }
                      disabled={
                        busyId ===
                        p.id
                      }
                      className="btn-press rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      ✓ Setujui
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        prosesPulang(
                          p,
                          'Rejected'
                        )
                      }
                      disabled={
                        busyId ===
                        p.id
                      }
                      className="btn-press rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"
                    >
                      ✕ Tolak
                    </button>
                  </div>
                ) : (
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold text-white ${
                      BADGE[
                        p.status
                      ] ??
                      'bg-slate-400'
                    }`}
                  >
                    {p.status.toUpperCase()}
                  </span>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}