import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buatUrlFile } from '../lib/api';
import { fmtTanggal } from '../lib/format';
import Modal from './Modal';

const HARI_INI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const sudahMulai = (a) =>
  !a.tanggal_mulai || a.tanggal_mulai <= HARI_INI;

const NILAI_WARNA = {
  A: 'bg-green-600',
  B: 'bg-teal-500',
  C: 'bg-amber-400',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

const SKALA = {
  A: 5,
  B: 4.5,
  C: 4,
  D: 3.5,
  E: 3,
};

function grupKartu(subtasks) {
  const map = new Map();

  (subtasks ?? []).forEach((s) => {
    const key = s.assignment_group;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(s);
  });

  return [...map.values()];
}

function formatBobot(value) {
  if (value === null || value === undefined) {
    return 'Otomatis';
  }

  const n = Number(value);

  if (Number.isInteger(n)) {
    return `${n}%`;
  }

  return `${Number(n.toFixed(2))}%`;
}

function ringkasanBobotPerPeserta(project) {
  const perIntern = new Map();

  for (const s of project.subtasks ?? []) {
    if (!perIntern.has(s.intern_id)) {
      perIntern.set(s.intern_id, {
        intern_id: s.intern_id,
        nama:
          s.interns?.nama_lengkap ??
          'Peserta',
        manual: 0,
        otomatis: 0,
        jumlah: 0,
      });
    }

    const item = perIntern.get(s.intern_id);

    item.jumlah += 1;

    if (s.bobot === null || s.bobot === undefined) {
      item.otomatis += 1;
    } else {
      item.manual += Number(s.bobot);
    }
  }

  return [...perIntern.values()].map((item) => {
    const sisa = Math.max(
      100 - item.manual,
      0
    );

    const bobotOtomatis =
      item.otomatis > 0
        ? sisa / item.otomatis
        : 0;

    const valid =
      item.manual <= 100 &&
      (
        item.otomatis > 0
          ? item.manual < 100
          : Math.abs(item.manual - 100) < 0.01
      );

    return {
      ...item,
      sisa,
      bobotOtomatis,
      valid,
    };
  });
}

export default function SubtaskManager({
  group,
  anggota,
  projekFilter = null,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pesan, setPesan] = useState(null);

  const [formProjek, setFormProjek] = useState({
    judul: '',
    deskripsi: '',
    deadline: '',
  });

  const [formSub, setFormSub] = useState({});

  const [bukaForm, setBukaForm] = useState(null);

  const [revisiGrup, setRevisiGrup] =
    useState(null);

  const [catatanRevisi, setCatatanRevisi] =
    useState('');

  const [busy, setBusy] = useState(false);

  const formRef = useRef(null);

  const anggotaSiap =
    anggota.filter(sudahMulai);

  const belumMulaiCount =
    anggota.length - anggotaSiap.length;

  useEffect(() => {
    muat();
  }, [group.id, projekFilter]);

  async function muat() {
    setLoading(true);

    try {
      let prj = [];

      if (projekFilter) {
        const { data, error } =
          await supabase
            .from('projects')
            .select('*')
            .eq('id', projekFilter);

        if (error) {
          throw error;
        }

        prj = data ?? [];
      } else {
        const { data, error } =
          await supabase
            .from('projects')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at');

        if (error) {
          throw error;
        }

        prj = data ?? [];
      }

      const ids = prj.map((p) => p.id);

      let subs = [];
      let grades = [];

      if (ids.length > 0) {
        const [subRes, gradeRes] =
          await Promise.all([
            supabase
              .from('subtasks')
              .select(
                '*, interns(nama_lengkap)'
              )
              .in('project_id', ids)
              .order('created_at'),

            supabase
              .from('project_grades')
              .select(
                'project_id, intern_id, nilai, catatan, updated_at'
              )
              .in('project_id', ids),
          ]);

        if (subRes.error) {
          throw subRes.error;
        }

        if (gradeRes.error) {
          throw gradeRes.error;
        }

        subs = subRes.data ?? [];
        grades = gradeRes.data ?? [];
      }

      setProjects(
        prj.map((p) => ({
          ...p,

          subtasks: subs.filter(
            (s) => s.project_id === p.id
          ),

          grades: grades.filter(
            (g) => g.project_id === p.id
          ),
        }))
      );
    } catch (e) {
      setPesan({
        tipe: 'err',
        teks:
          e?.message ??
          'Gagal memuat data projek.',
      });
    } finally {
      setLoading(false);
    }
  }

  function progres(p) {
    const groups =
      grupKartu(p.subtasks);

    const selesai = groups.filter(
      (g) =>
        g.every(
          (r) => r.status === 'Selesai'
        )
    ).length;

    const menunggu = groups.filter(
      (g) =>
        !g.every(
          (r) => r.status === 'Selesai'
        ) &&
        g.some(
          (r) =>
            r.status ===
            'Menunggu Review'
        )
    ).length;

    return {
      total: groups.length,
      selesai,
      menunggu,

      persen:
        groups.length > 0
          ? Math.round(
              (selesai * 100) /
                groups.length
            )
          : 0,
    };
  }

  function nilaiProjek(p) {
    return (p.grades ?? []).map(
      (grade) => {
        const sub =
          p.subtasks.find(
            (s) =>
              s.intern_id ===
              grade.intern_id
          );

        return {
          intern_id: grade.intern_id,

          nama:
            sub?.interns
              ?.nama_lengkap ??
            'Peserta',

          nilai:
            Number(grade.nilai),

          catatan:
            grade.catatan,
        };
      }
    );
  }

  function scrollKeForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
  }

  async function buatProjek(e) {
    e.preventDefault();

    setPesan(null);

    if (!formProjek.judul.trim()) {
      return setPesan({
        tipe: 'err',
        teks:
          'Judul projek wajib diisi.',
      });
    }

    const { data, error } =
      await supabase
        .from('projects')
        .insert({
          group_id: group.id,

          judul_projek:
            formProjek.judul.trim(),

          deskripsi:
            formProjek.deskripsi?.trim() ||
            null,

          deadline_projek:
            formProjek.deadline || null,
        })
        .select('id')
        .single();

    if (error) {
      return setPesan({
        tipe: 'err',
        teks: error.message,
      });
    }

    setPesan({
      tipe: 'ok',

      teks:
        `✅ Projek "${formProjek.judul.trim()}" berhasil dibuat! ` +
        'Sekarang tambahkan subtugas pertama di bawah ini ⬇️',
    });

    setFormProjek({
      judul: '',
      deskripsi: '',
      deadline: '',
    });

    await muat();

    setBukaForm(data.id);

    scrollKeForm();
  }

  function cekBobotUntukTarget(
    project,
    targets,
    bobotBaru
  ) {
    for (const target of targets) {
      const existing =
        project.subtasks.filter(
          (s) =>
            s.intern_id ===
            target.id
        );

      const totalManual =
        existing.reduce(
          (sum, s) =>
            sum +
            (
              s.bobot === null ||
              s.bobot === undefined
                ? 0
                : Number(s.bobot)
            ),
          0
        );

      if (
        bobotBaru !== null &&
        totalManual + bobotBaru > 100
      ) {
        return (
          `Bobot untuk ${target.nama_lengkap} akan menjadi ` +
          `${Number(
            (
              totalManual +
              bobotBaru
            ).toFixed(2)
          )}% dan melebihi 100%.`
        );
      }

      if (
        bobotBaru === null &&
        totalManual >= 100
      ) {
        return (
          `Bobot manual ${target.nama_lengkap} sudah mencapai 100%. ` +
          'Kurangi bobot tugas lain sebelum menambahkan tugas otomatis.'
        );
      }
    }

    return null;
  }

  async function tambahSubtugas(p) {
    const f =
      formSub[p.id] ?? {};

    setPesan(null);

    if (!f.judul?.trim()) {
      return setPesan({
        tipe: 'err',
        teks:
          'Judul subtugas wajib diisi.',
      });
    }

    if (anggota.length === 0) {
      return setPesan({
        tipe: 'err',
        teks:
          'Kelompok belum punya anggota.',
      });
    }

    const cek = f.cek ?? {};

    const targets =
      anggotaSiap.filter(
        (a) => cek[a.id]
      );

    if (targets.length === 0) {
      return setPesan({
        tipe: 'err',

        teks:
          '⚠ Pilih minimal 1 pengerja (centang nama di atas).',
      });
    }

    let bobot = null;

    if (
      f.bobot !== undefined &&
      f.bobot !== null &&
      String(f.bobot).trim() !== ''
    ) {
      bobot = Number(f.bobot);

      if (
        !Number.isFinite(bobot) ||
        bobot <= 0 ||
        bobot > 100
      ) {
        return setPesan({
          tipe: 'err',

          teks:
            'Bobot harus lebih dari 0 dan maksimal 100%.',
        });
      }
    }

    const masalahBobot =
      cekBobotUntukTarget(
        p,
        targets,
        bobot
      );

    if (masalahBobot) {
      return setPesan({
        tipe: 'err',
        teks: masalahBobot,
      });
    }

    const groupId =
      crypto.randomUUID?.() ??
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    const rows = targets.map(
      (target) => ({
        project_id: p.id,
        intern_id: target.id,
        assignment_group: groupId,

        judul: f.judul.trim(),

        deskripsi:
          f.deskripsi?.trim() ||
          null,

        deadline:
          f.deadline || null,

        bobot,
      })
    );

    const { error } =
      await supabase
        .from('subtasks')
        .insert(rows);

    if (error) {
      return setPesan({
        tipe: 'err',
        teks: error.message,
      });
    }

    setPesan({
      tipe: 'ok',

      teks:
        `✅ Subtugas "${f.judul.trim()}" berhasil ditambahkan ke projek ` +
        `"${p.judul_projek}" untuk ${targets.length} pengerja ` +
        `(${targets
          .map(
            (t) =>
              t.nama_lengkap?.split(
                ' '
              )[0]
          )
          .join(', ')}) — bobot ${
          bobot === null
            ? 'otomatis'
            : `${bobot}%`
        }.`,
    });

    setFormSub((state) => ({
      ...state,
      [p.id]: {},
    }));

    setBukaForm(null);

    await muat();
  }

  async function nilaiGrup(
    grup,
    huruf
  ) {
    setBusy(true);
    setPesan(null);

    const { error } =
      await supabase
        .from('subtasks')
        .update({
          nilai: huruf,
          status: 'Selesai',

          reviewed_at:
            new Date().toISOString(),
        })
        .eq(
          'assignment_group',
          grup[0].assignment_group
        );

    if (error) {
      setPesan({
        tipe: 'err',
        teks: error.message,
      });
    } else {
      const nama =
        grup
          .map(
            (r) =>
              r.interns
                ?.nama_lengkap
                ?.split(' ')[0]
          )
          .join(' & ');

      setPesan({
        tipe: 'ok',

        teks:
          `✅ Nilai ${huruf} untuk ${nama} tersimpan. ` +
          'Nilai projek akan muncul otomatis setelah 100% bobot tugas selesai dinilai.',
      });

      await muat();
    }

    setBusy(false);
  }

  async function kirimRevisi(e) {
    e.preventDefault();

    if (!revisiGrup) {
      return;
    }

    if (!catatanRevisi.trim()) {
      return setPesan({
        tipe: 'err',

        teks:
          'Tuliskan catatan revisi.',
      });
    }

    setBusy(true);
    setPesan(null);

    const { error } =
      await supabase
        .from('subtasks')
        .update({
          status: 'Revisi',

          catatan_revisi:
            catatanRevisi.trim(),

          nilai: null,

          reviewed_at:
            new Date().toISOString(),
        })
        .eq(
          'assignment_group',
          revisiGrup[0]
            .assignment_group
        );

    if (error) {
      setPesan({
        tipe: 'err',
        teks: error.message,
      });
    } else {
      setPesan({
        tipe: 'ok',

        teks:
          '🔁 Revisi dikirim ke semua pengerja tugas ini. Nilai projek dihitung ulang otomatis.',
      });

      setRevisiGrup(null);
      setCatatanRevisi('');

      await muat();
    }

    setBusy(false);
  }

  async function hapusGrup(grup) {
    const nama =
      grup
        .map(
          (r) =>
            r.interns
              ?.nama_lengkap
              ?.split(' ')[0]
        )
        .join(', ');

    if (
      !confirm(
        `Hapus tugas "${grup[0].judul}" dari ${nama}?`
      )
    ) {
      return;
    }

    setPesan(null);

    const { error } =
      await supabase
        .from('subtasks')
        .delete()
        .eq(
          'assignment_group',
          grup[0].assignment_group
        );

    if (error) {
      setPesan({
        tipe: 'err',
        teks: error.message,
      });

      return;
    }

    setPesan({
      tipe: 'ok',

      teks:
        '✅ Subtugas dihapus dan nilai projek dihitung ulang.',
    });

    await muat();
  }

  async function lihatFile(path) {
    try {
      window.open(
        await buatUrlFile(path),
        '_blank'
      );
    } catch (e) {
      setPesan({
        tipe: 'err',

        teks:
          e?.message ??
          'Gagal membuka file.',
      });
    }
  }

  const setFS = (
    projectId,
    field,
    value
  ) =>
    setFormSub((state) => ({
      ...state,

      [projectId]: {
        ...state[projectId],
        [field]: value,
      },
    }));

  const toggleCek = (
    projectId,
    internId
  ) =>
    setFormSub((state) => ({
      ...state,

      [projectId]: {
        ...state[projectId],

        cek: {
          ...(
            state[projectId]
              ?.cek ?? {}
          ),

          [internId]:
            !(
              state[projectId]
                ?.cek ?? {}
            )[internId],
        },
      },
    }));

  return (
    <div>
      {/* BANNER */}
      {pesan && (
        <div
          className={`anim-down sticky top-16 z-20 mb-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-lg ${
            pesan.tipe === 'ok'
              ? 'border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800'
              : 'border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700'
          }`}
        >
          <span className="text-base">
            {pesan.tipe === 'ok'
              ? '🎉'
              : '⚠️'}
          </span>

          <p className="flex-1">
            {pesan.teks}
          </p>

          <button
            onClick={() =>
              setPesan(null)
            }
            className="shrink-0 text-slate-400 transition hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORM PROJEK */}
      {!projekFilter && (
        <form
          onSubmit={buatProjek}
          className="rounded-xl border border-dashed border-slate-300 p-3"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            ➕ Projek Baru (Induk)
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              required
              placeholder="Judul projek *"
              value={
                formProjek.judul
              }
              onChange={(e) =>
                setFormProjek(
                  (f) => ({
                    ...f,
                    judul:
                      e.target
                        .value,
                  })
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none sm:col-span-2"
            />

            <input
              type="date"
              value={
                formProjek.deadline
              }
              onChange={(e) =>
                setFormProjek(
                  (f) => ({
                    ...f,
                    deadline:
                      e.target
                        .value,
                  })
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <textarea
              placeholder="Deskripsi (opsional)"
              rows={1}
              value={
                formProjek.deskripsi
              }
              onChange={(e) =>
                setFormProjek(
                  (f) => ({
                    ...f,
                    deskripsi:
                      e.target
                        .value,
                  })
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3"
            />
          </div>

          <button
            type="submit"
            className="btn-press mt-2 w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-green-500/25 hover:from-green-700 hover:to-emerald-700 sm:w-auto"
          >
            Buat Projek
          </button>
        </form>
      )}

      {/* DAFTAR PROJEK */}
      {loading ? (
        <div className="flex justify-center py-6">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          Belum ada projek — buat lewat
          form di atas 👆
        </p>
      ) : (
        projects.map((p) => {
          const progress =
            progres(p);

          const nilai =
            nilaiProjek(p);

          const bobotInfo =
            ringkasanBobotPerPeserta(
              p
            );

          return (
            <div
              key={p.id}
              className="mt-4 rounded-xl bg-slate-50 p-3 sm:p-4"
            >
              {/* HEADER PROJEK */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-slate-800">
                    📁{' '}
                    {
                      p.judul_projek
                    }
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {p.deadline_projek
                      ? `⏰ deadline ${fmtTanggal(
                          p.deadline_projek
                        )}`
                      : 'tanpa deadline'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setBukaForm(
                      bukaForm === p.id
                        ? null
                        : p.id
                    );

                    if (
                      bukaForm !==
                      p.id
                    ) {
                      scrollKeForm();
                    }
                  }}
                  className="btn-press w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 sm:w-auto"
                >
                  {bukaForm === p.id
                    ? '✕ Tutup'
                    : '+ Subtugas'}
                </button>
              </div>

              {/* PROGRESS */}
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-slate-600">
                    Milestone:{' '}
                    {
                      progress.persen
                    }
                    % (
                    {
                      progress.selesai
                    }
                    /
                    {
                      progress.total
                    }{' '}
                    tugas)

                    {progress.menunggu >
                      0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                        ⏳{' '}
                        {
                          progress.menunggu
                        }{' '}
                        menunggu
                        dinilai
                      </span>
                    )}
                  </span>
                </div>

                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${progress.persen}%`,
                    }}
                  />
                </div>
              </div>

              {/* RINGKASAN BOBOT */}
              {bobotInfo.length >
                0 && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                    ⚖️ Distribusi Bobot
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {bobotInfo.map(
                      (item) => (
                        <div
                          key={
                            item.intern_id
                          }
                          className="rounded-lg bg-white px-2.5 py-2 text-[10px] shadow-sm ring-1 ring-slate-100"
                        >
                          <p className="font-bold text-slate-700">
                            {
                              item.nama?.split(
                                ' '
                              )[0]
                            }
                          </p>

                          {item.otomatis ===
                            item.jumlah ? (
                            <p className="mt-0.5 text-indigo-600">
                              Otomatis
                              sama rata ·{' '}
                              {Number(
                                item.bobotOtomatis.toFixed(
                                  2
                                )
                              )}
                              % / tugas
                            </p>
                          ) : item.otomatis >
                            0 ? (
                            <p className="mt-0.5 text-slate-500">
                              {
                                item.manual
                              }
                              % manual ·{' '}
                              {
                                item.otomatis
                              }{' '}
                              otomatis @{' '}
                              {Number(
                                item.bobotOtomatis.toFixed(
                                  2
                                )
                              )}
                              %
                            </p>
                          ) : (
                            <p
                              className={`mt-0.5 ${
                                item.valid
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {
                                item.manual
                              }
                              % manual
                              {item.valid
                                ? ' ✓'
                                : ' ⚠'}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  <p className="mt-2 text-[10px] leading-relaxed text-indigo-500">
                    Bobot kosong
                    otomatis
                    memperoleh sisa
                    persentase sampai
                    total menjadi 100%.
                  </p>
                </div>
              )}

              {/* NILAI PROJEK */}
              {nilai.length > 0 ? (
                <div className="mt-3 rounded-xl border border-green-100 bg-green-50/70 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-green-600">
                    ⭐ Nilai Projek
                    Berbobot
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {nilai.map(
                      (v) => (
                        <span
                          key={
                            v.intern_id
                          }
                          className="rounded-lg bg-white px-3 py-2 text-[11px] text-slate-600 shadow-sm ring-1 ring-green-100"
                        >
                          {
                            v.nama?.split(
                              ' '
                            )[0]
                          }{' '}
                          <b className="text-green-700">
                            {v.nilai.toFixed(
                              2
                            )}
                          </b>
                          /5
                        </span>
                      )
                    )}
                  </div>
                </div>
              ) : (
                p.subtasks.length >
                  0 && (
                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[10px] font-medium text-slate-400">
                    ⭐ Nilai projek
                    belum tersedia —
                    nilai akan muncul
                    setelah 100% bobot
                    subtugas selesai
                    dinilai.
                  </p>
                )
              )}

              {/* TUGAS */}
              {p.subtasks.length >
                0 && (
                <ul className="mt-3 space-y-2.5">
                  {grupKartu(
                    p.subtasks
                  ).map(
                    (grup) => {
                      const g0 =
                        grup[0];

                      const selesaiSemua =
                        grup.every(
                          (r) =>
                            r.status ===
                            'Selesai'
                        );

                      const adaReview =
                        grup.some(
                          (r) =>
                            r.status ===
                            'Menunggu Review'
                        );

                      const telat =
                        g0.deadline &&
                        new Date(
                          `${g0.deadline}T23:59:59`
                        ) <
                          new Date() &&
                        !selesaiSemua;

                      return (
                        <li
                          key={
                            g0.assignment_group
                          }
                          className={`overflow-hidden rounded-xl border shadow-sm ${
                            adaReview
                              ? 'border-amber-300 bg-amber-50/40'
                              : selesaiSemua
                                ? 'border-green-200 bg-green-50/30'
                                : g0.status ===
                                    'Revisi'
                                  ? 'border-red-200 bg-red-50/30'
                                  : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 p-3.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p
                                  className={`text-sm font-bold leading-snug ${
                                    selesaiSemua
                                      ? 'text-slate-400 line-through'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {
                                    g0.judul
                                  }
                                </p>

                                {grup.length >
                                  1 && (
                                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-600">
                                    👥{' '}
                                    {
                                      grup.length
                                    }
                                  </span>
                                )}

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    g0.bobot ===
                                      null ||
                                    g0.bobot ===
                                      undefined
                                      ? 'bg-purple-100 text-purple-600'
                                      : 'bg-blue-100 text-blue-600'
                                  }`}
                                >
                                  ⚖️{' '}
                                  {formatBobot(
                                    g0.bobot
                                  )}
                                </span>
                              </div>

                              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]">
                                <span className="font-semibold text-slate-500">
                                  👤{' '}
                                  {grup
                                    .map(
                                      (
                                        r
                                      ) =>
                                        r
                                          .interns
                                          ?.nama_lengkap
                                          ?.split(
                                            ' '
                                          )[0] ??
                                        '?'
                                    )
                                    .join(
                                      ', '
                                    )}
                                </span>

                                {g0.deadline && (
                                  <span
                                    className={`font-bold ${
                                      telat
                                        ? 'text-red-500'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    ⏰{' '}
                                    {fmtTanggal(
                                      g0.deadline
                                    )}
                                    {telat
                                      ? ' — TERLAMBAT'
                                      : ''}
                                  </span>
                                )}
                              </p>

                              {g0.bobot ===
                                null && (
                                <p className="mt-1 text-[10px] text-purple-500">
                                  Bobot
                                  efektif
                                  dihitung
                                  otomatis
                                  dari sisa
                                  bobot
                                  projek.
                                </p>
                              )}

                              {grup
                                .filter(
                                  (r) =>
                                    r.file_bukti ||
                                    r.catatan_pengumpulan
                                )
                                .map(
                                  (r) => (
                                    <div
                                      key={
                                        r.id
                                      }
                                      className="mt-2 space-y-0.5 rounded-lg bg-slate-100/70 px-2.5 py-1.5"
                                    >
                                      {r.file_bukti && (
                                        <button
                                          onClick={() =>
                                            lihatFile(
                                              r.file_bukti
                                            )
                                          }
                                          className="text-[11px] font-bold text-blue-600 hover:underline"
                                        >
                                          📎
                                          laporan{' '}
                                          {
                                            r
                                              .interns
                                              ?.nama_lengkap
                                              ?.split(
                                                ' '
                                              )[0]
                                          }
                                        </button>
                                      )}

                                      {r.catatan_pengumpulan && (
                                        <p className="text-[11px] italic leading-snug text-slate-500">
                                          💬 "
                                          {
                                            r.catatan_pengumpulan
                                          }
                                          "
                                        </p>
                                      )}
                                    </div>
                                  )
                                )}

                              {g0.status ===
                                'Revisi' &&
                                g0.catatan_revisi && (
                                  <div className="mt-2 rounded-lg border-l-[3px] border-red-400 bg-red-50 px-2.5 py-1.5">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-red-500">
                                      Revisi
                                    </p>

                                    <p className="text-[11px] leading-snug text-red-600">
                                      {
                                        g0.catatan_revisi
                                      }
                                    </p>
                                  </div>
                                )}

                              {!selesaiSemua &&
                                !adaReview && (
                                  <p className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                                    {grup.map(
                                      (
                                        r
                                      ) => (
                                        <span
                                          key={
                                            r.id
                                          }
                                          className={`rounded-full px-2 py-0.5 font-bold ${
                                            r.status ===
                                            'Belum'
                                              ? 'bg-slate-100 text-slate-500'
                                              : r.status ===
                                                  'Revisi'
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-amber-100 text-amber-700'
                                          }`}
                                        >
                                          {
                                            r
                                              .interns
                                              ?.nama_lengkap
                                              ?.split(
                                                ' '
                                              )[0]
                                          }
                                        </span>
                                      )
                                    )}
                                  </p>
                                )}
                            </div>

                            {selesaiSemua && (
                              <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow ${
                                  NILAI_WARNA[
                                    g0
                                      .nilai
                                  ] ??
                                  'bg-slate-400'
                                }`}
                              >
                                {g0.nilai ??
                                  '—'}
                              </span>
                            )}
                          </div>

                          {/* PENILAIAN */}
                          {adaReview && (
                            <div className="border-t border-amber-200 bg-amber-50/50 px-3.5 py-3">
                              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                                Pilih
                                nilai:
                              </p>

                              <div className="flex items-stretch justify-between gap-2">
                                {[
                                  'A',
                                  'B',
                                  'C',
                                  'D',
                                  'E',
                                ].map(
                                  (
                                    h
                                  ) => (
                                    <button
                                      key={
                                        h
                                      }
                                      onClick={() =>
                                        nilaiGrup(
                                          grup,
                                          h
                                        )
                                      }
                                      disabled={
                                        busy
                                      }
                                      title={`Nilai ${h} = ${SKALA[h]}/5`}
                                      className={`btn-press flex h-12 flex-1 flex-col items-center justify-center rounded-xl text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
                                        NILAI_WARNA[
                                          h
                                        ]
                                      }`}
                                    >
                                      <span className="text-base font-black leading-none">
                                        {
                                          h
                                        }
                                      </span>

                                      <span className="mt-0.5 text-[9px] font-bold opacity-80">
                                        {
                                          SKALA[
                                            h
                                          ]
                                        }
                                      </span>
                                    </button>
                                  )
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setRevisiGrup(
                                    grup
                                  );

                                  setCatatanRevisi(
                                    ''
                                  );
                                }}
                                className="btn-press mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-orange-300 bg-white py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-50 active:scale-[0.98]"
                              >
                                🔁 Minta
                                Revisi
                              </button>
                            </div>
                          )}

                          <div className="flex justify-end px-3.5 pb-2">
                            <button
                              onClick={() =>
                                hapusGrup(
                                  grup
                                )
                              }
                              className="text-[10px] font-semibold text-slate-300 transition hover:text-red-500"
                            >
                              hapus
                            </button>
                          </div>
                        </li>
                      );
                    }
                  )}
                </ul>
              )}

              {/* FORM SUBTUGAS */}
              {bukaForm === p.id && (
                <div
                  ref={formRef}
                  className="anim-down mt-3 space-y-3 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-md"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">
                    ➕ Subtugas
                    untuk:{' '}
                    {
                      p.judul_projek
                    }
                  </p>

                  <input
                    placeholder="Judul subtugas *"
                    value={
                      formSub[p.id]
                        ?.judul ?? ''
                    }
                    onChange={(e) =>
                      setFS(
                        p.id,
                        'judul',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
                  />

                  <textarea
                    placeholder="Instruksi detail (opsional)"
                    rows={2}
                    value={
                      formSub[p.id]
                        ?.deskripsi ??
                      ''
                    }
                    onChange={(e) =>
                      setFS(
                        p.id,
                        'deskripsi',
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />

                  {/* PENGERJA */}
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[11px] font-bold uppercase text-slate-400">
                      Pengerja
                      subtugas *
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                      {anggotaSiap.map(
                        (a) => (
                          <label
                            key={
                              a.id
                            }
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={
                                !!(
                                  formSub[
                                    p
                                      .id
                                  ]
                                    ?.cek ??
                                  {}
                                )[
                                  a
                                    .id
                                ]
                              }
                              onChange={() =>
                                toggleCek(
                                  p.id,
                                  a.id
                                )
                              }
                              className="h-4 w-4 accent-indigo-600"
                            />

                            {
                              a.nama_lengkap
                            }
                          </label>
                        )
                      )}

                      {anggotaSiap.length ===
                        0 && (
                        <p className="text-xs text-amber-600">
                          ⚠ Semua
                          anggota
                          belum mulai
                          masa
                          magang.
                        </p>
                      )}
                    </div>

                    {belumMulaiCount >
                      0 && (
                      <p className="mt-1 text-[10px] text-amber-500">
                        ⚠{' '}
                        {
                          belumMulaiCount
                        }{' '}
                        anggota
                        belum mulai
                        — tidak
                        dapat
                        dipilih.
                      </p>
                    )}

                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      💡 Tugas
                      multi-pengerja
                      dinilai
                      sebagai satu —
                      seluruh
                      pengerja
                      memperoleh
                      nilai dan
                      bobot yang
                      sama.
                    </p>
                  </div>

                  {/* BOBOT */}
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-purple-700">
                          ⚖️ Bobot
                          Subtugas
                        </p>

                        <p className="mt-0.5 text-[10px] leading-relaxed text-purple-500">
                          Opsional.
                          Kosongkan
                          jika bobot
                          ingin
                          dibagi
                          otomatis
                          dari sisa
                          100%.
                        </p>
                      </div>

                      <div className="relative w-full sm:w-36">
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={
                            formSub[
                              p.id
                            ]?.bobot ??
                            ''
                          }
                          onChange={(
                            e
                          ) =>
                            setFS(
                              p.id,
                              'bobot',
                              e.target
                                .value
                            )
                          }
                          placeholder="Auto"
                          className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 pr-8 text-sm font-bold text-slate-700 outline-none focus:border-purple-500"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
                      Contoh:{' '}
                      <b>
                        50%, 30%,
                        kosong
                      </b>{' '}
                      → tugas
                      kosong
                      otomatis
                      mendapat{' '}
                      <b>20%</b>.
                    </div>
                  </div>

                  {/* DEADLINE */}
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[11px] font-bold text-slate-500">
                      ⏰ Tenggat:
                    </span>

                    <input
                      type="date"
                      value={
                        formSub[p.id]
                          ?.deadline ??
                        ''
                      }
                      onChange={(e) =>
                        setFS(
                          p.id,
                          'deadline',
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
                    />
                  </div>

                  <button
                    onClick={() =>
                      tambahSubtugas(
                        p
                      )
                    }
                    className="btn-press w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700"
                  >
                    ✓ Tambahkan
                    Subtugas
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* MODAL REVISI */}
      <Modal
        open={!!revisiGrup}
        onClose={() =>
          setRevisiGrup(null)
        }
        title="🔁 Minta Revisi Subtugas"
      >
        {revisiGrup && (
          <form
            onSubmit={kirimRevisi}
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Subtugas{' '}
              <b>
                "
                {
                  revisiGrup[0]
                    .judul
                }
                "
              </b>{' '}
              akan
              dikembalikan ke{' '}
              <b>
                {revisiGrup
                  .map(
                    (r) =>
                      r.interns
                        ?.nama_lengkap
                  )
                  .join(', ')}
              </b>{' '}
              dengan catatan
              revisimu.
            </p>

            <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[11px] leading-relaxed text-orange-600">
              ⚠ Nilai
              subtugas akan
              dikosongkan dan
              nilai projek
              otomatis dihitung
              ulang sampai tugas
              ini selesai
              direview kembali.
            </p>

            <textarea
              value={
                catatanRevisi
              }
              onChange={(e) =>
                setCatatanRevisi(
                  e.target.value
                )
              }
              rows={4}
              placeholder="Instruksi perbaikan… (wajib diisi)"
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-orange-500 focus:outline-none"
            />

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setRevisiGrup(
                    null
                  )
                }
                className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={busy}
                className="btn-press rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {busy
                  ? 'Mengirim…'
                  : 'Kirim Revisi'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}