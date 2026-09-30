import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  Pencil,
  X,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import {
  fmtTanggal,
} from '../../lib/format';

import ConfirmModal from '../../components/ConfirmModal';


/* =========================================================
   TANGGAL WIB
========================================================= */

const HARI_INI =
  new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Jakarta',

      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(
    new Date()
  );


const sudahMulai =
  (intern) =>
    !intern.tanggal_mulai ||
    intern.tanggal_mulai <=
      HARI_INI;


/* =========================================================
   COMPONENT
========================================================= */

export default function Groups() {
  /* =======================================================
     DATA
  ======================================================= */

  const [
    groups,
    setGroups,
  ] = useState([]);

  const [
    direktori,
    setDirektori,
  ] = useState([]);

  const [
    interns,
    setInterns,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    sukses,
    setSukses,
  ] = useState(null);


  /* =======================================================
     FORM KELOMPOK BARU
  ======================================================= */

  const [
    form,
    setForm,
  ] = useState({
    nama_kelompok: '',
    batch_label: '',
    mentor_id: '',
  });


  /* =======================================================
     PILIH INTERN
  ======================================================= */

  const [
    pilihIntern,
    setPilihIntern,
  ] = useState({});


  /* =======================================================
     EDIT NAMA KELOMPOK
  ======================================================= */

  const [
    editNama,
    setEditNama,
  ] = useState(null);

  /*
    Bentuk:
    {
      id: UUID,
      value: 'Nama kelompok'
    }
  */

  const [
    savingNama,
    setSavingNama,
  ] = useState(false);


  /* =======================================================
     CONFIRM MODAL
  ======================================================= */

  const [
    konfirmasiKeluarkan,
    setKonfirmasiKeluarkan,
  ] = useState(null);

  const [
    konfirmasiMasukkan,
    setKonfirmasiMasukkan,
  ] = useState(null);

  const [
    busy,
    setBusy,
  ] = useState(false);


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    muat();
  }, []);


  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function muat() {
    setLoading(true);

    const [
      {
        data: g,
        error: groupError,
      },

      {
        data: dir,
        error: dirError,
      },

      {
        data: itn,
        error: internError,
      },
    ] =
      await Promise.all([
        supabase
          .from(
            'groups'
          )
          .select('*')
          .order(
            'created_at'
          ),

        supabase.rpc(
          'get_profile_directory'
        ),

        supabase
          .from(
            'interns'
          )
          .select(
            `
            id,
            nama_lengkap,
            email,
            group_id,
            tanggal_mulai,
            status_magang
            `
          )
          .eq(
            'status_magang',
            'Active'
          )
          .order(
            'nama_lengkap'
          ),
      ]);

    if (
      groupError ||
      dirError ||
      internError
    ) {
      setError(
        groupError?.message ||
          dirError?.message ||
          internError?.message ||
          'Gagal memuat data kelompok.'
      );
    }

    setGroups(
      g ?? []
    );

    setDirektori(
      dir ?? []
    );

    setInterns(
      itn ?? []
    );

    setLoading(false);
  }


  /* =======================================================
     DATA TURUNAN
  ======================================================= */

  const mentors =
    direktori.filter(
      (p) =>
        p.role ===
        'mentor'
    );


  const anggota =
    (groupId) =>
      interns.filter(
        (intern) =>
          intern.group_id ===
          groupId
      );


  const tanpaKelompok =
    interns.filter(
      (intern) =>
        !intern.group_id
    );


  /* =======================================================
     BUAT KELOMPOK
  ======================================================= */

  async function buatKelompok(
    e
  ) {
    e.preventDefault();

    setError(null);
    setSukses(null);

    const nama =
      form.nama_kelompok.trim();

    if (!nama) {
      setError(
        'Nama kelompok wajib diisi.'
      );

      return;
    }

    const {
      error: insertError,
    } =
      await supabase
        .from(
          'groups'
        )
        .insert({
          nama_kelompok:
            nama,

          batch_label:
            form.batch_label.trim() ||
            null,

          mentor_id:
            form.mentor_id ||
            null,
        });

    if (insertError) {
      if (
        insertError.code ===
        '23505'
      ) {
        setError(
          'Nama kelompok tersebut sudah digunakan. Gunakan nama lain.'
        );

        return;
      }

      setError(
        insertError.message
      );

      return;
    }

    setForm({
      nama_kelompok: '',
      batch_label: '',
      mentor_id: '',
    });

    setSukses(
      'Kelompok baru berhasil dibuat.'
    );

    await muat();
  }


  /* =======================================================
     EDIT NAMA KELOMPOK
  ======================================================= */

  function mulaiEditNama(
    group
  ) {
    setError(null);
    setSukses(null);

    setEditNama({
      id: group.id,

      value:
        group.nama_kelompok ??
        '',
    });
  }


  function batalEditNama() {
    if (savingNama) {
      return;
    }

    setEditNama(null);
  }


  async function simpanNamaKelompok(
    group
  ) {
    if (
      !editNama ||
      editNama.id !==
        group.id
    ) {
      return;
    }

    setError(null);
    setSukses(null);

    const namaBaru =
      editNama.value.trim();

    const namaLama =
      (
        group.nama_kelompok ??
        ''
      ).trim();


    /* Nama tidak boleh kosong */
    if (!namaBaru) {
      setError(
        'Nama kelompok tidak boleh kosong.'
      );

      return;
    }


    /*
      Tidak perlu hit DB
      kalau nama tidak berubah.
    */
    if (
      namaBaru ===
      namaLama
    ) {
      setEditNama(null);
      return;
    }


    setSavingNama(true);

    const {
      error: updateError,
    } =
      await supabase
        .from(
          'groups'
        )
        .update({
          nama_kelompok:
            namaBaru,
        })
        .eq(
          'id',
          group.id
        );


    if (updateError) {
      setSavingNama(false);

      /*
        nama_kelompok memiliki
        unique constraint.
      */
      if (
        updateError.code ===
        '23505'
      ) {
        setError(
          `Nama kelompok "${namaBaru}" sudah digunakan oleh kelompok lain.`
        );

        return;
      }

      setError(
        updateError.message ||
          'Nama kelompok gagal diperbarui.'
      );

      return;
    }


    setEditNama(null);

    setSukses(
      `Nama kelompok berhasil diubah menjadi "${namaBaru}".`
    );

    await muat();

    setSavingNama(false);
  }


  /* =======================================================
     MASUKKAN PESERTA
  ======================================================= */

  function mintaMasukkan(
    groupId,
    internId
  ) {
    if (!internId) {
      return;
    }

    setError(null);
    setSukses(null);

    const target =
      tanpaKelompok.find(
        (intern) =>
          intern.id ===
          internId
      );


    if (
      target &&
      !sudahMulai(
        target
      )
    ) {
      setKonfirmasiMasukkan({
        groupId,
        intern:
          target,
      });

      setPilihIntern(
        (state) => ({
          ...state,

          [groupId]:
            '',
        })
      );

      return;
    }


    eksekusiMasukkan(
      groupId,
      internId
    );
  }


  async function eksekusiMasukkan(
    groupId,
    internId
  ) {
    if (!internId) {
      return;
    }

    setBusy(true);
    setError(null);
    setSukses(null);

    const {
      error: updateError,
    } =
      await supabase
        .from(
          'interns'
        )
        .update({
          group_id:
            groupId,
        })
        .eq(
          'id',
          internId
        );


    if (updateError) {
      setError(
        updateError.message
      );
    } else {
      setSukses(
        'Peserta berhasil dimasukkan ke kelompok.'
      );
    }


    setPilihIntern(
      (state) => ({
        ...state,

        [groupId]:
          '',
      })
    );

    await muat();

    setBusy(false);
  }


  /* =======================================================
     KELUARKAN PESERTA
  ======================================================= */

  async function eksekusiKeluarkan() {
    if (
      !konfirmasiKeluarkan
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setSukses(null);

    const {
      error: updateError,
    } =
      await supabase
        .from(
          'interns'
        )
        .update({
          group_id:
            null,
        })
        .eq(
          'id',
          konfirmasiKeluarkan.id
        );


    if (updateError) {
      setError(
        updateError.message
      );
    } else {
      setSukses(
        `${konfirmasiKeluarkan.nama_lengkap} berhasil dikeluarkan dari kelompok.`
      );
    }


    setKonfirmasiKeluarkan(
      null
    );

    await muat();

    setBusy(false);
  }


  /* =======================================================
     GANTI MENTOR
  ======================================================= */

  async function gantiMentor(
    groupId,
    mentorId
  ) {
    setError(null);
    setSukses(null);

    const {
      error: updateError,
    } =
      await supabase
        .from(
          'groups'
        )
        .update({
          mentor_id:
            mentorId ||
            null,
        })
        .eq(
          'id',
          groupId
        );


    if (updateError) {
      setError(
        updateError.message
      );

      return;
    }


    setSukses(
      'Pembimbing kelompok berhasil diperbarui.'
    );

    await muat();
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />

        <p className="text-sm text-slate-400">
          Memuat data...
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
          Kelompok Magang
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Kelola kelompok,
          pembimbing, nama
          kelompok, serta
          penempatan peserta
          magang.
        </p>
      </div>


      {/* ERROR */}

      {error && (
        <div className="anim-down mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-600">
            ⚠️ {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="shrink-0 text-red-400 transition hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}


      {/* SUCCESS */}

      {sukses && (
        <div className="anim-down mt-4 flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">
            ✅ {sukses}
          </p>

          <button
            type="button"
            onClick={() =>
              setSukses(null)
            }
            className="shrink-0 text-green-500 transition hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}


      {/* =================================================
          BUAT KELOMPOK BARU
      ================================================= */}

      <form
        onSubmit={
          buatKelompok
        }
        className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Buat Kelompok Baru
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Nama kelompok *"
            value={
              form.nama_kelompok
            }
            onChange={(e) =>
              setForm(
                (state) => ({
                  ...state,

                  nama_kelompok:
                    e.target.value,
                })
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <input
            placeholder="Batch (opsional)"
            value={
              form.batch_label
            }
            onChange={(e) =>
              setForm(
                (state) => ({
                  ...state,

                  batch_label:
                    e.target.value,
                })
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <select
            value={
              form.mentor_id
            }
            onChange={(e) =>
              setForm(
                (state) => ({
                  ...state,

                  mentor_id:
                    e.target.value,
                })
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">
              Pilih pembimbing…
              (opsional)
            </option>

            {mentors.map(
              (mentor) => (
                <option
                  key={
                    mentor.id
                  }
                  value={
                    mentor.id
                  }
                >
                  {
                    mentor.nama_lengkap
                  }
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="submit"
          className="btn-press mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-purple-700 sm:w-auto"
        >
          Buat Kelompok
        </button>
      </form>


      {/* =================================================
          DAFTAR KELOMPOK
      ================================================= */}

      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">
        👥 Daftar Kelompok (
        {groups.length})
      </h2>


      <div className="mt-3 space-y-4">
        {groups.length ===
        0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="anim-float text-5xl">
              👥
            </p>

            <p className="mt-4 font-bold text-slate-600">
              Belum Ada
              Kelompok
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Buat kelompok
              pertama lewat form
              di atas
            </p>
          </div>
        ) : (
          groups.map(
            (
              group,
              index
            ) => {
              const daftarAnggota =
                anggota(
                  group.id
                );

              const belumMulaiCount =
                daftarAnggota.filter(
                  (intern) =>
                    !sudahMulai(
                      intern
                    )
                ).length;

              const sedangEdit =
                editNama?.id ===
                group.id;


              return (
                <div
                  key={
                    group.id
                  }
                  className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                  style={{
                    animationDelay: `${200 + index * 90}ms`,
                  }}
                >
                  {/* ACCENT */}

                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />


                  {/* HEADER KELOMPOK */}

                  <div className="flex flex-col gap-4 pl-3 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0 flex-1">

                      {/* ============================
                          EDIT NAMA
                      ============================ */}

                      {sedangEdit ? (
                        <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            autoFocus
                            value={
                              editNama.value
                            }
                            disabled={
                              savingNama
                            }
                            onChange={(e) =>
                              setEditNama(
                                (
                                  state
                                ) => ({
                                  ...state,

                                  value:
                                    e.target.value,
                                })
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                'Enter'
                              ) {
                                e.preventDefault();

                                simpanNamaKelompok(
                                  group
                                );
                              }

                              if (
                                e.key ===
                                'Escape'
                              ) {
                                batalEditNama();
                              }
                            }}
                            className="h-10 min-w-0 flex-1 rounded-xl border border-indigo-300 bg-indigo-50/40 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={
                                savingNama
                              }
                              onClick={() =>
                                simpanNamaKelompok(
                                  group
                                )
                              }
                              title="Simpan nama kelompok"
                              className="btn-press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingNama ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <Check
                                  size={
                                    15
                                  }
                                />
                              )}

                              Simpan
                            </button>

                            <button
                              type="button"
                              disabled={
                                savingNama
                              }
                              onClick={
                                batalEditNama
                              }
                              title="Batal"
                              className="btn-press flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X
                                size={
                                  15
                                }
                              />

                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-extrabold text-slate-800">
                            {
                              group.nama_kelompok
                            }
                          </h3>

                          {/* EDIT BUTTON */}

                          <button
                            type="button"
                            onClick={() =>
                              mulaiEditNama(
                                group
                              )
                            }
                            className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-500 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit nama kelompok"
                          >
                            <Pencil
                              size={
                                13
                              }
                            />

                            Edit Nama
                          </button>
                        </div>
                      )}


                      {/* BATCH + MENTOR */}

                      <div className="mt-1.5 flex flex-col gap-2 text-[11px] font-medium text-slate-400 sm:flex-row sm:flex-wrap sm:items-center">
                        <span>
                          {group.batch_label ??
                            'tanpa batch'}
                        </span>

                        <span className="hidden sm:inline">
                          ·
                        </span>

                        <select
                          value={
                            group.mentor_id ??
                            ''
                          }
                          onChange={(e) =>
                            gantiMentor(
                              group.id,
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none transition focus:border-indigo-500 sm:w-auto"
                        >
                          <option value="">
                            — pilih
                            pembimbing —
                          </option>

                          {mentors.map(
                            (
                              mentor
                            ) => (
                              <option
                                key={
                                  mentor.id
                                }
                                value={
                                  mentor.id
                                }
                              >
                                🧑‍🏫{' '}
                                {
                                  mentor.nama_lengkap
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>


                    {/* COUNT */}

                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end sm:gap-1">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600">
                        {
                          daftarAnggota.length
                        }{' '}
                        anggota
                      </span>

                      {belumMulaiCount >
                        0 && (
                        <span className="anim-pop rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                          ⏳{' '}
                          {
                            belumMulaiCount
                          }{' '}
                          belum mulai
                        </span>
                      )}
                    </div>
                  </div>


                  {/* =================================================
                      ANGGOTA
                  ================================================= */}

                  <div className="mt-4 flex flex-wrap gap-2 pl-3">
                    {daftarAnggota.length ===
                    0 ? (
                      <p className="text-xs italic text-slate-300">
                        Belum ada
                        anggota…
                      </p>
                    ) : (
                      daftarAnggota.map(
                        (
                          anggotaItem,
                          anggotaIndex
                        ) => (
                          <span
                            key={
                              anggotaItem.id
                            }
                            className={`anim-pop group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-bold ${
                              sudahMulai(
                                anggotaItem
                              )
                                ? 'border-slate-100 bg-slate-50 text-slate-700'
                                : 'border-amber-200 bg-amber-50 text-amber-600'
                            }`}
                            style={{
                              animationDelay: `${250 + index * 90 + anggotaIndex * 60}ms`,
                            }}
                          >
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${
                                sudahMulai(
                                  anggotaItem
                                )
                                  ? 'bg-indigo-600'
                                  : 'bg-amber-400'
                              }`}
                            >
                              {anggotaItem.nama_lengkap
                                ?.split(
                                  ' '
                                )
                                .map(
                                  (
                                    kata
                                  ) =>
                                    kata[0]
                                )
                                .slice(
                                  0,
                                  2
                                )
                                .join(
                                  ''
                                )}
                            </span>

                            {
                              anggotaItem.nama_lengkap
                            }

                            {!sudahMulai(
                              anggotaItem
                            ) &&
                              ' ⏳'}

                            <button
                              type="button"
                              onClick={() =>
                                setKonfirmasiKeluarkan(
                                  anggotaItem
                                )
                              }
                              title="Keluarkan dari kelompok"
                              className="ml-0.5 text-slate-300 transition hover:text-red-500"
                            >
                              ✕
                            </button>
                          </span>
                        )
                      )
                    )}
                  </div>


                  {/* =================================================
                      TAMBAH ANGGOTA
                  ================================================= */}

                  {tanpaKelompok.length >
                    0 && (
                    <div className="mt-4 flex flex-col gap-2 pl-3 sm:flex-row">
                      <select
                        value={
                          pilihIntern[
                            group.id
                          ] ??
                          ''
                        }
                        onChange={(e) =>
                          setPilihIntern(
                            (
                              state
                            ) => ({
                              ...state,

                              [group.id]:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">
                          + Masukkan
                          peserta ke
                          kelompok ini…
                        </option>

                        {tanpaKelompok.map(
                          (
                            intern
                          ) => (
                            <option
                              key={
                                intern.id
                              }
                              value={
                                intern.id
                              }
                            >
                              {
                                intern.nama_lengkap
                              }{' '}
                              —{' '}
                              {
                                intern.email
                              }

                              {!sudahMulai(
                                intern
                              )
                                ? ' (belum mulai)'
                                : ''}
                            </option>
                          )
                        )}
                      </select>

                      <button
                        type="button"
                        disabled={
                          busy ||
                          !pilihIntern[
                            group.id
                          ]
                        }
                        onClick={() =>
                          mintaMasukkan(
                            group.id,

                            pilihIntern[
                              group.id
                            ]
                          )
                        }
                        className="btn-press w-full shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        Masukkan
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          )
        )}
      </div>


      {/* =================================================
          CONFIRM KELUARKAN
      ================================================= */}

      <ConfirmModal
        open={
          !!konfirmasiKeluarkan
        }
        onClose={() =>
          setKonfirmasiKeluarkan(
            null
          )
        }
        onConfirm={
          eksekusiKeluarkan
        }
        busy={
          busy
        }
        judul={
          konfirmasiKeluarkan
            ? `Keluarkan "${konfirmasiKeluarkan.nama_lengkap}"?`
            : ''
        }
        teks="Peserta akan dikeluarkan dari kelompok ini dan kembali ke daftar tanpa kelompok."
        teksConfirm="Ya, Keluarkan"
        tipe="warn"
      />


      {/* =================================================
          CONFIRM PESERTA BELUM MULAI
      ================================================= */}

      <ConfirmModal
        open={
          !!konfirmasiMasukkan
        }
        onClose={() =>
          setKonfirmasiMasukkan(
            null
          )
        }
        onConfirm={() => {
          const {
            groupId,
            intern,
          } =
            konfirmasiMasukkan ??
            {};

          setKonfirmasiMasukkan(
            null
          );

          if (
            groupId &&
            intern
          ) {
            eksekusiMasukkan(
              groupId,
              intern.id
            );
          }
        }}
        busy={
          busy
        }
        judul={
          konfirmasiMasukkan
            ? `Masukkan "${konfirmasiMasukkan.intern.nama_lengkap}"?`
            : ''
        }
        teks={
          konfirmasiMasukkan
            ? `⚠️ Peserta ini BELUM memulai masa magang (mulai ${fmtTanggal(
                konfirmasiMasukkan
                  .intern
                  .tanggal_mulai
              )}). Dia tetap bisa dimasukkan untuk persiapan, namun TIDAK akan bisa diberi tugas sampai masa magangnya dimulai.`
            : ''
        }
        teksConfirm="Tetap Masukkan"
        tipe="warn"
      />
    </div>
  );
}