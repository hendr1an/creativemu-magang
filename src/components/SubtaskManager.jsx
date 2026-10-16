
import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CalendarClock,
  FolderKanban,
  Plus,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Pencil,
  FileText,
  Link2,
  ExternalLink,
  Paperclip,
  RotateCcw,
  Trash2,
  Send,
  Users,
  Award,
  X,
  Save,
} from 'lucide-react';

import { supabase } from '../lib/supabaseClient';
import { buatUrlFile } from '../lib/api';
import { fmtTanggal } from '../lib/format';
import Modal from './Modal';
import DeadlineModal from './DeadlineModal';

const NILAI_WARNA = {
  A: 'bg-emerald-600',
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

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const MOTION = `
@keyframes stmEnter {
  from {
    opacity: 0;
    transform: translateY(13px) scale(.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes stmPop {
  from {
    opacity: 0;
    transform: scale(.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.stm-enter {
  animation: stmEnter .42s cubic-bezier(.2,.8,.2,1) both;
}

.stm-pop {
  animation: stmPop .3s cubic-bezier(.2,.8,.2,1) both;
}

.stm-card {
  transition:
    transform .25s ease,
    border-color .25s ease,
    box-shadow .25s ease;
}

.stm-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99,102,241,.24);
  box-shadow: 0 14px 34px rgba(15,23,42,.055);
}

.stm-btn {
  transition:
    transform .16s ease,
    background-color .2s ease,
    box-shadow .2s ease;
}

.stm-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.stm-btn:not(:disabled):active {
  transform: scale(.97);
}

@media (prefers-reduced-motion: reduce) {
  .stm-enter,
  .stm-pop {
    animation: none !important;
  }

  .stm-card,
  .stm-btn {
    transition: none !important;
  }

  .stm-card:hover,
  .stm-btn:hover,
  .stm-btn:active {
    transform: none !important;
  }
}
`;

function tanggalWib() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sudahMulai(anggota) {
  return (
    !anggota.tanggal_mulai ||
    anggota.tanggal_mulai <= tanggalWib()
  );
}

function sudahLewat(tanggal) {
  return Boolean(tanggal && tanggal < tanggalWib());
}

function formatBobot(value) {
  if (value === null || value === undefined) {
    return 'Otomatis';
  }

  const angka = Number(value);

  return Number.isInteger(angka)
    ? `${angka}%`
    : `${Number(angka.toFixed(2))}%`;
}

function grupKartu(subtasks) {
  const grup = new Map();

  (subtasks ?? []).forEach((subtask) => {
    // Tugas tanpa assignment_group jangan digabungkan.
    const key = subtask.assignment_group || subtask.id;

    if (!grup.has(key)) {
      grup.set(key, []);
    }

    grup.get(key).push(subtask);
  });

  return [...grup.values()];
}

function ringkasanBobotPerPeserta(project) {
  const hasil = new Map();

  for (const s of project.subtasks ?? []) {
    if (!hasil.has(s.intern_id)) {
      hasil.set(s.intern_id, {
        intern_id: s.intern_id,
        nama: s.interns?.nama_lengkap ?? 'Peserta',
        manual: 0,
        otomatis: 0,
        jumlah: 0,
      });
    }

    const item = hasil.get(s.intern_id);

    item.jumlah += 1;

    if (s.bobot === null || s.bobot === undefined) {
      item.otomatis += 1;
    } else {
      item.manual += Number(s.bobot);
    }
  }

  return [...hasil.values()].map((item) => {
    const sisa = Math.max(100 - item.manual, 0);

    const bobotOtomatis =
      item.otomatis > 0
        ? sisa / item.otomatis
        : 0;

    return {
      ...item,
      sisa,
      bobotOtomatis,
      valid:
        item.manual <= 100 &&
        (item.otomatis > 0
          ? item.manual < 100
          : Math.abs(item.manual - 100) < 0.01),
    };
  });
}

function linkValid(raw) {
  try {
    const url = new URL(raw);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function NamaPeserta({ grup }) {
  return (
    <span>
      {grup
        .map(
          (r) =>
            r.interns?.nama_lengkap
              ?.split(' ')[0] ?? 'Peserta'
        )
        .join(', ')}
    </span>
  );
}

export default function SubtaskManager({
  group,
  anggota,
  projekFilter = null,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);

  const [formProjek, setFormProjek] = useState({
    judul: '',
    deskripsi: '',
    deadline: '',
  });

  const [formSub, setFormSub] = useState({});
  const [bukaForm, setBukaForm] = useState(null);

  const [revisiGrup, setRevisiGrup] = useState(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');

  const [editDeadline, setEditDeadline] = useState(null);
  const [deadlineBaru, setDeadlineBaru] = useState('');

  const [hapusTarget, setHapusTarget] = useState(null);

  const [bukaProjek, setBukaProjek] = useState({});
  const formRef = useRef(null);

  const anggotaList = anggota ?? [];
  const anggotaSiap = anggotaList.filter(sudahMulai);
  const belumMulaiCount =
    anggotaList.length - anggotaSiap.length;

  useEffect(() => {
    if (group?.id) {
      muat();
    }
  }, [group?.id, projekFilter]);

  async function muat() {
    if (!group?.id) return;

    setLoading(true);

    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at');

      if (projekFilter) {
        query = query.eq('id', projekFilter);
      }

      const { data: dataProjek, error: errorProjek } =
        await query;

      if (errorProjek) throw errorProjek;

      const daftarProjek = dataProjek ?? [];
      const ids = daftarProjek.map((p) => p.id);

      let subtasks = [];
      let grades = [];

      if (ids.length > 0) {
        const [subRes, gradeRes] = await Promise.all([
          supabase
            .from('subtasks')
            .select('*, interns(nama_lengkap)')
            .in('project_id', ids)
            .order('created_at'),

          supabase
            .from('project_grades')
            .select(
              'project_id, intern_id, nilai, catatan, updated_at'
            )
            .in('project_id', ids),
        ]);

        if (subRes.error) throw subRes.error;
        if (gradeRes.error) throw gradeRes.error;

        subtasks = subRes.data ?? [];
        grades = gradeRes.data ?? [];
      }

      setProjects(
        daftarProjek.map((p) => ({
          ...p,
          subtasks: subtasks.filter(
            (s) => s.project_id === p.id
          ),
          grades: grades.filter(
            (g) => g.project_id === p.id
          ),
        }))
      );
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal memuat proyek.',
      });
    } finally {
      setLoading(false);
    }
  }

  function notifikasi(tipe, teks) {
    setPesan({ tipe, teks });
  }

  function setFS(projectId, field, value) {
    setFormSub((previous) => ({
      ...previous,
      [projectId]: {
        ...(previous[projectId] ?? {}),
        [field]: value,
      },
    }));
  }

  function toggleCek(projectId, internId) {
    setFormSub((previous) => {
      const form = previous[projectId] ?? {};
      const cek = form.cek ?? {};

      return {
        ...previous,
        [projectId]: {
          ...form,
          cek: {
            ...cek,
            [internId]: !cek[internId],
          },
        },
      };
    });
  }

  function scrollKeForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
  }

  function progres(p) {
    const groups = grupKartu(p.subtasks);

    const selesai = groups.filter(
      (g) => g.every((r) => r.status === 'Selesai')
    ).length;

    const menunggu = groups.filter(
      (g) =>
        !g.every((r) => r.status === 'Selesai') &&
        g.some((r) => r.status === 'Menunggu Review')
    ).length;

    return {
      total: groups.length,
      selesai,
      menunggu,
      persen: groups.length
        ? Math.round((selesai * 100) / groups.length)
        : 0,
    };
  }

  function nilaiProjek(p) {
    return (p.grades ?? []).map((grade) => {
      const sub = p.subtasks.find(
        (s) => s.intern_id === grade.intern_id
      );

      return {
        intern_id: grade.intern_id,
        nama: sub?.interns?.nama_lengkap ?? 'Peserta',
        nilai: Number(grade.nilai),
        catatan: grade.catatan,
      };
    });
  }

  async function buatProjek(e) {
    e.preventDefault();

    if (busy) return;

    if (!formProjek.judul.trim()) {
      return notifikasi(
        'err',
        'Judul proyek wajib diisi.'
      );
    }

    setBusy(true);
    setPesan(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          group_id: group.id,
          judul_projek: formProjek.judul.trim(),
          deskripsi: formProjek.deskripsi.trim() || null,
          deadline_projek: formProjek.deadline || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      setFormProjek({
        judul: '',
        deskripsi: '',
        deadline: '',
      });

      await muat();

      setBukaForm(data.id);
      setBukaProjek((state) => ({
        ...state,
        [data.id]: true,
      }));

      scrollKeForm();

      notifikasi(
        'ok',
        'Proyek berhasil dibuat. Sekarang tambahkan subtugas.'
      );
    } catch (err) {
      notifikasi('err', err.message);
    } finally {
      setBusy(false);
    }
  }

  function cekBobotUntukTarget(project, targets, bobotBaru) {
    for (const target of targets) {
      const existing = project.subtasks.filter(
        (s) => s.intern_id === target.id
      );

      const totalManual = existing.reduce(
        (sum, s) =>
          sum +
          (s.bobot === null || s.bobot === undefined
            ? 0
            : Number(s.bobot)),
        0
      );

      if (
        bobotBaru !== null &&
        totalManual + bobotBaru > 100
      ) {
        return (
          `Bobot ${target.nama_lengkap} akan melebihi 100%.`
        );
      }

      if (
        bobotBaru === null &&
        totalManual >= 100
      ) {
        return (
          `Bobot manual ${target.nama_lengkap} sudah 100%. ` +
          'Tidak ada sisa untuk bobot otomatis.'
        );
      }
    }

    return null;
  }

  async function tambahSubtugas(p) {
    if (busy) return;

    const f = formSub[p.id] ?? {};

    if (!f.judul?.trim()) {
      return notifikasi(
        'err',
        'Judul subtugas wajib diisi.'
      );
    }

    const targets = anggotaSiap.filter(
      (anggotaItem) => (f.cek ?? {})[anggotaItem.id]
    );

    if (targets.length === 0) {
      return notifikasi(
        'err',
        'Pilih minimal satu peserta yang sudah memulai magang.'
      );
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
        return notifikasi(
          'err',
          'Bobot harus lebih dari 0 dan maksimal 100%.'
        );
      }
    }

    const masalahBobot = cekBobotUntukTarget(
      p,
      targets,
      bobot
    );

    if (masalahBobot) {
      return notifikasi('err', masalahBobot);
    }

    const assignmentGroup = crypto.randomUUID();

    const rows = targets.map((target) => ({
      project_id: p.id,
      intern_id: target.id,
      assignment_group: assignmentGroup,
      judul: f.judul.trim(),
      deskripsi: f.deskripsi?.trim() || null,
      deadline: f.deadline || null,
      bobot,
    }));

    setBusy(true);
    setPesan(null);

    try {
      const { error } = await supabase
        .from('subtasks')
        .insert(rows);

      if (error) throw error;

      setFormSub((state) => ({
        ...state,
        [p.id]: {},
      }));

      setBukaForm(null);

      await muat();

      notifikasi(
        'ok',
        `Subtugas "${f.judul.trim()}" berhasil diberikan ` +
        `kepada ${targets.length} peserta dengan bobot ` +
        `${formatBobot(bobot)}.`
      );
    } catch (err) {
      notifikasi('err', err.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // EDIT DEADLINE PROJECT / SUBTASK
  // =========================================

  function bukaEditProjek(p) {
    setEditDeadline({
      type: 'project',
      id: p.id,
      title: p.judul_projek,
      oldValue: p.deadline_projek || '',
      count: 1,
    });

    setDeadlineBaru(p.deadline_projek || '');
  }

  function bukaEditSubtask(p, grup) {
    setEditDeadline({
      type: 'subtask',
      projectId: p.id,
      ids: grup.map((r) => r.id),
      title: grup[0].judul,
      oldValue: grup[0].deadline || '',
      count: grup.length,
    });

    setDeadlineBaru(grup[0].deadline || '');
  }

  function tutupEditDeadline() {
    if (busy) return;

    setEditDeadline(null);
    setDeadlineBaru('');
  }

  async function simpanDeadline(e) {
    e.preventDefault();

    if (!editDeadline || busy) return;

    const tanggal = deadlineBaru || null;

    if (
      tanggal === (editDeadline.oldValue || null)
    ) {
      notifikasi(
        'ok',
        'Deadline tidak berubah.'
      );
      tutupEditDeadline();
      return;
    }

    setBusy(true);
    setPesan(null);

    try {
      if (editDeadline.type === 'project') {
        // UPDATE proyek dibatasi ke group.id.
        const { data, error } = await supabase
          .from('projects')
          .update({
            deadline_projek: tanggal,
          })
          .eq('id', editDeadline.id)
          .eq('group_id', group.id)
          .select('id');

        if (error) throw error;

        if (data?.length !== 1) {
          throw new Error(
            'Proyek tidak ditemukan atau tidak dapat diperbarui.'
          );
        }
      } else {
        // Satu UPDATE SQL untuk semua penerima subtugas.
        // Tidak menyentuh nilai, status, atau bukti.
        const { data, error } = await supabase
          .from('subtasks')
          .update({
            deadline: tanggal,
          })
          .eq('project_id', editDeadline.projectId)
          .in('id', editDeadline.ids)
          .select('id');

        if (error) throw error;

        if (data?.length !== editDeadline.ids.length) {
          throw new Error(
            'Jumlah subtugas yang diperbarui tidak sesuai. ' +
            'Muat ulang data dan periksa akses mentor.'
          );
        }
      }

      const jenis =
        editDeadline.type === 'project'
          ? 'proyek'
          : 'subtugas';

      setEditDeadline(null);
      setDeadlineBaru('');

      await muat();

      notifikasi(
        'ok',
        `Deadline ${jenis} berhasil diperbarui` +
        (tanggal
          ? ` menjadi ${fmtTanggal(tanggal)}.`
          : ' menjadi tanpa tenggat.')
      );
    } catch (err) {
      notifikasi(
        'err',
        err.message || 'Gagal memperbarui deadline.'
      );
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // REVIEW & NILAI
  // =========================================

  async function nilaiGrup(grup, huruf) {
    if (busy) return;

    setBusy(true);
    setPesan(null);

    try {
      let query = supabase
        .from('subtasks')
        .update({
          nilai: huruf,
          status: 'Selesai',
          reviewed_at: new Date().toISOString(),
        })
        .eq('project_id', grup[0].project_id);

      if (grup[0].assignment_group) {
        query = query.eq(
          'assignment_group',
          grup[0].assignment_group
        );
      } else {
        query = query.eq('id', grup[0].id);
      }

      const { data, error } = await query.select('id');

      if (error) throw error;

      if (data?.length !== grup.length) {
        throw new Error(
          'Tidak seluruh subtugas dapat dinilai. Refresh data.'
        );
      }

      await muat();

      notifikasi(
        'ok',
        `Nilai ${huruf} berhasil diberikan kepada ` +
        `${grup.length} peserta. Nilai proyek akan dihitung ulang.`
      );
    } catch (err) {
      notifikasi('err', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function kirimRevisi(e) {
    e.preventDefault();

    if (!revisiGrup || busy) return;

    if (!catatanRevisi.trim()) {
      return notifikasi(
        'err',
        'Tuliskan catatan revisi.'
      );
    }

    setBusy(true);
    setPesan(null);

    try {
      let query = supabase
        .from('subtasks')
        .update({
          status: 'Revisi',
          catatan_revisi: catatanRevisi.trim(),
          nilai: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('project_id', revisiGrup[0].project_id);

      if (revisiGrup[0].assignment_group) {
        query = query.eq(
          'assignment_group',
          revisiGrup[0].assignment_group
        );
      } else {
        query = query.eq('id', revisiGrup[0].id);
      }

      const { data, error } = await query.select('id');

      if (error) throw error;

      if (data?.length !== revisiGrup.length) {
        throw new Error(
          'Tidak semua peserta berhasil menerima revisi.'
        );
      }

      setRevisiGrup(null);
      setCatatanRevisi('');

      await muat();

      notifikasi(
        'ok',
        'Permintaan revisi berhasil dikirim ke seluruh pengerja.'
      );
    } catch (err) {
      notifikasi('err', err.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // DELETE SUBTASK GROUP
  // =========================================

  function bukaHapus(grup) {
    setHapusTarget(grup);
  }

  async function hapusGrup() {
    if (!hapusTarget || busy) return;

    setBusy(true);
    setPesan(null);

    try {
      let query = supabase
        .from('subtasks')
        .delete()
        .eq('project_id', hapusTarget[0].project_id);

      if (hapusTarget[0].assignment_group) {
        query = query.eq(
          'assignment_group',
          hapusTarget[0].assignment_group
        );
      } else {
        query = query.eq('id', hapusTarget[0].id);
      }

      const { data, error } = await query.select('id');

      if (error) throw error;

      if (data?.length !== hapusTarget.length) {
        throw new Error(
          'Sebagian subtugas tidak dapat dihapus.'
        );
      }

      setHapusTarget(null);

      await muat();

      notifikasi(
        'ok',
        'Subtugas berhasil dihapus. Nilai proyek diperbarui.'
      );
    } catch (err) {
      notifikasi('err', err.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // OPEN EVIDENCE
  // =========================================

  async function lihatFile(path) {
    try {
      const url = await buatUrlFile(path);

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      notifikasi(
        'err',
        err.message || 'Gagal membuka file.'
      );
    }
  }

  function lihatLink(raw) {
    const valid = linkValid(raw);

    if (!valid) {
      notifikasi(
        'err',
        'Link pengumpulan tidak valid.'
      );
      return;
    }

    window.open(valid, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-5">
      <style>{MOTION}</style>

      {/* NOTIFICATION */}

      {pesan && (
        <div
          role={pesan.tipe === 'ok' ? 'status' : 'alert'}
          className={`stm-pop sticky top-16 z-20 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="flex items-start gap-2">
            {pesan.tipe === 'ok' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}

            {pesan.teks}
          </span>

          <button
            type="button"
            onClick={() => setPesan(null)}
            aria-label="Tutup notifikasi"
            className="stm-btn rounded-lg p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CREATE PROJECT */}

      {!projekFilter && (
        <form
          onSubmit={buatProjek}
          className="stm-enter overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FolderKanban size={20} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Buat Proyek Baru
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Tentukan proyek induk sebelum membagikan subtugas.
              </p>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Judul Proyek *
                </label>

                <input
                  required
                  maxLength={200}
                  value={formProjek.judul}
                  onChange={(e) =>
                    setFormProjek((f) => ({
                      ...f,
                      judul: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Website Landing Page"
                  className={INPUT}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Tenggat Proyek
                </label>

                <input
                  type="date"
                  value={formProjek.deadline}
                  onChange={(e) =>
                    setFormProjek((f) => ({
                      ...f,
                      deadline: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Deskripsi
              </label>

              <textarea
                rows={2}
                value={formProjek.deskripsi}
                onChange={(e) =>
                  setFormProjek((f) => ({
                    ...f,
                    deskripsi: e.target.value,
                  }))
                }
                placeholder="Jelaskan tujuan dan gambaran proyek..."
                className={INPUT}
              />
            </div>

            <button
              type="submit"
              disabled={busy || !formProjek.judul.trim()}
              className="stm-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={17} />
              {busy ? 'Membuat...' : 'Buat Proyek'}
            </button>
          </div>
        </form>
      )}

      {/* PROJECT LIST */}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-52 rounded-3xl" />
          <div className="skeleton h-52 rounded-3xl" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FolderKanban
            size={29}
            className="mx-auto text-slate-300"
          />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Belum ada proyek
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Buat proyek pertama untuk kelompok ini.
          </p>
        </div>
      ) : (
        projects.map((p, projectIndex) => {
          const progress = progres(p);
          const nilai = nilaiProjek(p);
          const bobotInfo = ringkasanBobotPerPeserta(p);
          const groups = grupKartu(p.subtasks);

          const expanded = bukaProjek[p.id] ?? true;

          return (
            <article
              key={p.id}
              className="stm-enter stm-card overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
              style={{
                animationDelay:
                  `${Math.min(projectIndex * 80, 400)}ms`,
              }}
            >
              {/* PROJECT HEADER */}

              <div className="border-b border-slate-100 px-5 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FolderKanban size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-semibold text-slate-900">
                        {p.judul_projek}
                      </h3>

                      {p.deskripsi && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                          {p.deskripsi}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays size={14} />
                          {p.deadline_projek
                            ? fmtTanggal(p.deadline_projek)
                            : 'Tanpa deadline'}
                        </span>

                        {sudahLewat(p.deadline_projek) &&
                          progress.persen < 100 && (
                            <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                              Melewati tenggat
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* PROJECT ACTIONS */}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => bukaEditProjek(p)}
                      className="stm-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                    >
                      <CalendarClock size={15} />
                      Edit Tenggat
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const next = bukaForm === p.id
                          ? null
                          : p.id;

                        setBukaForm(next);

                        if (next) scrollKeForm();
                      }}
                      className="stm-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Plus size={15} />
                      {bukaForm === p.id
                        ? 'Tutup Form'
                        : 'Subtugas'}
                    </button>
                  </div>
                </div>

                {/* PROJECT PROGRESS */}

                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      Milestone {progress.persen}%
                    </span>

                    <span className="text-slate-400">
                      {progress.selesai}/{progress.total} tugas selesai
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      style={{ width: `${progress.persen}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        progress.persen === 100
                          ? 'bg-emerald-500'
                          : 'bg-indigo-600'
                      }`}
                    />
                  </div>

                  {progress.menunggu > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock3 size={14} />
                      {progress.menunggu} tugas menunggu review
                    </p>
                  )}
                </div>
              </div>

              {/* WEIGHT SUMMARY */}

              {bobotInfo.length > 0 && (
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Award size={16} className="text-indigo-600" />
                    Distribusi Bobot
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {bobotInfo.map((item) => (
                      <div
                        key={item.intern_id}
                        className="rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs"
                      >
                        <p className="font-semibold text-slate-800">
                          {item.nama?.split(' ')[0]}
                        </p>

                        <p className={`mt-1 ${
                          item.valid
                            ? 'text-slate-500'
                            : 'text-red-600'
                        }`}>
                          {item.manual}% manual
                          {item.otomatis > 0 &&
                            ` · ${item.otomatis} otomatis @ ${Number(
                              item.bobotOtomatis.toFixed(2)
                            )}%`}
                          {!item.valid && ' · Periksa bobot'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Bobot kosong memperoleh pembagian otomatis
                    dari sisa bobot setiap peserta hingga 100%.
                  </p>
                </div>
              )}

              {/* PROJECT GRADES */}

              {nilai.length > 0 && (
                <div className="border-b border-slate-100 bg-emerald-50/30 px-5 py-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Award size={16} />
                    Nilai Proyek Berbobot
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {nilai.map((v) => (
                      <span
                        key={v.intern_id}
                        className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-600"
                      >
                        {v.nama?.split(' ')[0]}{' '}
                        <b className="text-emerald-700">
                          {v.nilai.toFixed(2)}
                        </b>
                        /5
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {nilai.length === 0 && p.subtasks.length > 0 && (
                <p className="border-b border-slate-100 px-5 py-3 text-[11px] text-slate-400">
                  Nilai proyek akan muncul setelah seluruh bobot
                  subtugas selesai dinilai.
                </p>
              )}

              {/* TASK LIST HEADING */}

              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setBukaProjek((previous) => ({
                    ...previous,
                    [p.id]: !expanded,
                  }))
                }
                className="stm-btn flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileText size={17} className="text-indigo-600" />
                  Daftar Subtugas ({groups.length})
                </span>

                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-300 ${
                    expanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* TASK CARDS */}

              {expanded && (
                <div className="space-y-3 border-t border-slate-100 bg-[#FAFAFC] p-4 sm:p-5">
                  {groups.length === 0 ? (
                    <p className="py-5 text-center text-xs text-slate-400">
                      Belum ada subtugas. Tambahkan subtugas pertama.
                    </p>
                  ) : (
                    groups.map((grup, index) => {
                      const g0 = grup[0];

                      const selesaiSemua = grup.every(
                        (r) => r.status === 'Selesai'
                      );

                      const adaReview = grup.some(
                        (r) => r.status === 'Menunggu Review'
                      );

                      const adaRevisi = grup.some(
                        (r) => r.status === 'Revisi'
                      );

                      const telat =
                        sudahLewat(g0.deadline) &&
                        !selesaiSemua;

                      return (
                        <div
                          key={g0.assignment_group || g0.id}
                          className={`stm-enter stm-card overflow-hidden rounded-2xl border bg-white ${
                            adaReview
                              ? 'border-amber-200'
                              : adaRevisi
                                ? 'border-red-200'
                                : selesaiSemua
                                  ? 'border-emerald-200'
                                  : 'border-slate-200'
                          }`}
                          style={{
                            animationDelay:
                              `${Math.min(index * 50, 250)}ms`,
                          }}
                        >
                          <div className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">

                                  <h4 className={`text-sm font-semibold ${
                                    selesaiSemua
                                      ? 'text-slate-500'
                                      : 'text-slate-900'
                                  }`}>
                                    {g0.judul}
                                  </h4>

                                  {grup.length > 1 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">
                                      <Users size={12} />
                                      {grup.length} peserta
                                    </span>
                                  )}

                                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-semibold text-purple-600">
                                    {formatBobot(g0.bobot)}
                                  </span>
                                </div>

                                {g0.deskripsi && (
                                  <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                                    {g0.deskripsi}
                                  </p>
                                )}

                                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                  <Users size={13} />
                                  <NamaPeserta grup={grup} />
                                </p>

                                <p className={`mt-2 flex items-center gap-1.5 text-xs ${
                                  telat
                                    ? 'font-semibold text-red-500'
                                    : 'text-slate-500'
                                }`}>
                                  <CalendarDays size={14} />
                                  {g0.deadline
                                    ? fmtTanggal(g0.deadline)
                                    : 'Tanpa tenggat'}
                                  {telat && ' · Terlambat'}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-wrap items-center gap-2">

                                {selesaiSemua && (
                                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white ${
                                    NILAI_WARNA[g0.nilai] ||
                                    'bg-slate-400'
                                  }`}>
                                    {g0.nilai || '—'}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => bukaEditSubtask(p, grup)}
                                  className="stm-btn inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                >
                                  <Pencil size={14} />
                                  Tenggat
                                </button>
                              </div>
                            </div>

                            {/* EVIDENCE BY PARTICIPANT */}

                            {grup.some(
                              (r) =>
                                r.file_bukti ||
                                r.link_bukti ||
                                r.catatan_pengumpulan
                            ) && (
                              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">

                                <p className="text-[11px] font-semibold text-slate-500">
                                  Hasil Pengumpulan Peserta
                                </p>

                                {grup
                                  .filter(
                                    (r) =>
                                      r.file_bukti ||
                                      r.link_bukti ||
                                      r.catatan_pengumpulan
                                  )
                                  .map((r) => (
                                    <div
                                      key={r.id}
                                      className="rounded-xl bg-[#F7F8FB] p-3"
                                    >
                                      <p className="text-xs font-semibold text-slate-700">
                                        {r.interns?.nama_lengkap ||
                                          'Peserta'}
                                      </p>

                                      <div className="mt-2 flex flex-wrap gap-2">

                                        {r.file_bukti && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              lihatFile(r.file_bukti)
                                            }
                                            className="stm-btn inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                                          >
                                            <Paperclip size={13} />
                                            Buka File
                                          </button>
                                        )}

                                        {r.link_bukti && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              lihatLink(r.link_bukti)
                                            }
                                            className="stm-btn inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                                          >
                                            <Link2 size={13} />
                                            Buka Link
                                            <ExternalLink size={12} />
                                          </button>
                                        )}
                                      </div>

                                      {r.catatan_pengumpulan && (
                                        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                                          {r.catatan_pengumpulan}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* REVISION NOTE */}

                            {adaRevisi &&
                              grup.some((r) => r.catatan_revisi) && (
                                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                                  <p className="flex items-center gap-2 text-xs font-semibold text-red-700">
                                    <RotateCcw size={14} />
                                    Catatan Revisi
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-red-600">
                                    {grup.find(
                                      (r) => r.catatan_revisi
                                    )?.catatan_revisi}
                                  </p>
                                </div>
                              )}

                            {/* PARTICIPANT STATUSES */}

                            {!selesaiSemua && (
                              <div className="mt-4 flex flex-wrap gap-1.5">
                                {grup.map((r) => (
                                  <span
                                    key={r.id}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                      r.status === 'Belum'
                                        ? 'bg-slate-100 text-slate-600'
                                        : r.status === 'Revisi'
                                          ? 'bg-red-50 text-red-600'
                                          : r.status === 'Menunggu Review'
                                            ? 'bg-amber-50 text-amber-700'
                                            : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {r.interns?.nama_lengkap
                                      ?.split(' ')[0]}
                                    {' · '}
                                    {r.status}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* REVIEW ACTIONS */}

                          {adaReview && (
                            <div className="border-t border-amber-100 bg-amber-50/50 p-4">
                              <p className="mb-3 text-xs font-semibold text-amber-800">
                                Berikan Nilai Subtugas
                              </p>

                              <div className="grid grid-cols-5 gap-2">

                                {Object.keys(SKALA).map((huruf) => (
                                  <button
                                    key={huruf}
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      nilaiGrup(grup, huruf)
                                    }
                                    title={`${huruf} = ${SKALA[huruf]}/5`}
                                    className={`stm-btn flex h-12 flex-col items-center justify-center rounded-xl text-white shadow-sm disabled:opacity-50 ${
                                      NILAI_WARNA[huruf]
                                    }`}
                                  >
                                    <span className="text-base font-bold">
                                      {huruf}
                                    </span>

                                    <span className="text-[10px] opacity-80">
                                      {SKALA[huruf]}
                                    </span>
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setRevisiGrup(grup);
                                  setCatatanRevisi('');
                                }}
                                className="stm-btn mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                              >
                                <RotateCcw size={15} />
                                Minta Revisi
                              </button>
                            </div>
                          )}

                          {/* DELETE ACTION */}

                          <div className="flex justify-end border-t border-slate-100 px-4 py-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => bukaHapus(grup)}
                              className="stm-btn inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              Hapus subtugas
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* CREATE SUBTASK FORM */}

              {bukaForm === p.id && (
                <div
                  ref={formRef}
                  className="stm-enter space-y-4 border-t border-indigo-100 bg-indigo-50/30 p-5"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={18} className="text-indigo-600" />

                    <h4 className="text-sm font-semibold text-slate-900">
                      Tambah Subtugas — {p.judul_projek}
                    </h4>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Judul Subtugas *
                    </label>

                    <input
                      value={formSub[p.id]?.judul ?? ''}
                      onChange={(e) =>
                        setFS(p.id, 'judul', e.target.value)
                      }
                      placeholder="Contoh: Desain halaman beranda"
                      className={INPUT}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Instruksi
                    </label>

                    <textarea
                      rows={2}
                      value={formSub[p.id]?.deskripsi ?? ''}
                      onChange={(e) =>
                        setFS(p.id, 'deskripsi', e.target.value)
                      }
                      placeholder="Jelaskan hasil yang diharapkan..."
                      className={INPUT}
                    />
                  </div>

                  {/* ASSIGNEES */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Users size={16} className="text-indigo-600" />
                      Pengerja Subtugas *
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3">
                      {anggotaSiap.map((a) => (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 transition hover:bg-indigo-50"
                        >
                          <input
                            type="checkbox"
                            checked={
                              !!(formSub[p.id]?.cek ?? {})[a.id]
                            }
                            onChange={() => toggleCek(p.id, a.id)}
                            className="h-4 w-4 accent-indigo-600"
                          />

                          {a.nama_lengkap}
                        </label>
                      ))}

                      {anggotaSiap.length === 0 && (
                        <p className="text-xs text-amber-600">
                          Belum ada anggota yang mulai magang.
                        </p>
                      )}
                    </div>

                    {belumMulaiCount > 0 && (
                      <p className="mt-3 text-[11px] text-amber-600">
                        {belumMulaiCount} anggota belum memulai
                        masa magang dan tidak dapat dipilih.
                      </p>
                    )}

                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                      Tugas multi-pengerja dinilai sebagai satu tugas.
                      Setiap pengerja mendapat nilai dan bobot
                      yang sama.
                    </p>
                  </div>

                  {/* WEIGHT & DEADLINE */}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Bobot (%)
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={formSub[p.id]?.bobot ?? ''}
                        onChange={(e) =>
                          setFS(p.id, 'bobot', e.target.value)
                        }
                        placeholder="Kosong = otomatis"
                        className={INPUT}
                      />

                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Kosongkan agar dibagi otomatis dari sisa 100%.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Tenggat Subtugas
                      </label>

                      <input
                        type="date"
                        value={formSub[p.id]?.deadline ?? ''}
                        onChange={(e) =>
                          setFS(p.id, 'deadline', e.target.value)
                        }
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => tambahSubtugas(p)}
                    className="stm-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Plus size={17} />
                    {busy ? 'Menyimpan...' : 'Tambahkan Subtugas'}
                  </button>
                </div>
              )}
            </article>
          );
        })
      )}

      {/* EDIT DEADLINE MODAL */}

      {/* EDIT DEADLINE MODAL */}

<DeadlineModal
  open={!!editDeadline}
  onClose={tutupEditDeadline}
  busy={busy}
  title={
    editDeadline?.type === 'project'
      ? 'Edit Tenggat Proyek'
      : 'Edit Tenggat Subtugas'
  }
>     {editDeadline && (
          <form onSubmit={simpanDeadline} className="space-y-5">

            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                <CalendarClock size={22} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {editDeadline.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-600">
                  {editDeadline.type === 'project'
                    ? 'Perubahan berlaku untuk proyek induk.'
                    : `Perubahan berlaku untuk ${editDeadline.count} peserta dalam penugasan ini.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Tenggat Sebelumnya
                </label>

                <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                  {editDeadline.oldValue
                    ? fmtTanggal(editDeadline.oldValue)
                    : 'Tanpa tenggat'}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Tenggat Baru
                </label>

                <input
                  type="date"
                  value={deadlineBaru}
                  disabled={busy}
                  onChange={(e) => setDeadlineBaru(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              Perubahan deadline tidak menghapus file, link,
              catatan pengumpulan, status review, atau nilai
              subtugas. Kosongkan tanggal jika ingin
              menghapus batas tenggat.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={tutupEditDeadline}
                className="stm-btn h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={busy}
                className="stm-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Save size={16} />
                )}

                {busy ? 'Menyimpan...' : 'Simpan Tenggat'}
              </button>
            </div>
          </form>
        )}
      </DeadlineModal>

      {/* REVISION MODAL */}

      <Modal
        open={!!revisiGrup}
        onClose={() => {
          if (!busy) {
            setRevisiGrup(null);
            setCatatanRevisi('');
          }
        }}
        title="Minta Revisi Subtugas"
      >
        {revisiGrup && (
          <form onSubmit={kirimRevisi} className="space-y-4">

            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {revisiGrup[0].judul}
              </p>

              <p className="mt-1 text-xs leading-5 text-orange-700">
                Revisi akan dikirim kepada{' '}
                <NamaPeserta grup={revisiGrup} />.
                Nilai subtugas dikosongkan dan
                nilai proyek dihitung ulang.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Catatan Perbaikan *
              </label>

              <textarea
                required
                rows={4}
                disabled={busy}
                value={catatanRevisi}
                onChange={(e) =>
                  setCatatanRevisi(e.target.value)
                }
                placeholder="Jelaskan bagian yang harus diperbaiki..."
                className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRevisiGrup(null)}
                className="stm-btn h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={busy || !catatanRevisi.trim()}
                className="stm-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Send size={16} />
                {busy ? 'Mengirim...' : 'Kirim Revisi'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE CONFIRMATION */}

      <Modal
        open={!!hapusTarget}
        onClose={() => {
          if (!busy) setHapusTarget(null);
        }}
        title="Hapus Subtugas"
      >
        {hapusTarget && (
          <div className="space-y-5">

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Hapus "{hapusTarget[0].judul}"?
              </p>

              <p className="mt-2 text-xs leading-5 text-red-600">
                Subtugas akan dihapus dari{' '}
                <NamaPeserta grup={hapusTarget} />.
                Tindakan ini juga dapat memengaruhi
                perhitungan nilai proyek.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setHapusTarget(null)}
                className="stm-btn h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={hapusGrup}
                className="stm-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {busy ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
