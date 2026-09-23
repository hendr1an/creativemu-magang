import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useMentor } from '../../hooks/useMentor';
import RadarNilai from '../../components/RadarNilai';
import Modal from '../../components/Modal';
import { fmtTanggal } from '../../lib/format';

const HARI_INI = new Date().toISOString().slice(0, 10);
const bulanSekarang = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit',
}).format(new Date());

// ===== ⭐ DATA INDIKATOR (untuk modal info) =====
const INDIKATOR = {
  inisiatif: {
    judul: '1. Inisiatif',
    sumber: '🧑‍🏫 dinilai mentor',
    skala: {
      5: 'Sangat inisiatif — selalu mencari peluang untuk berkontribusi dan mampu bekerja secara mandiri.',
      4: 'Sering menunjukkan inisiatif — proaktif dalam membantu dan mencari solusi.',
      3: 'Cukup inisiatif — kadang proaktif dalam mencari tugas tambahan.',
    },
  },
  pemecahan: {
    judul: '2. Kemampuan Pemecahan Masalah',
    sumber: '⚙️ otomatis — kecepatan pengumpulan subtugas vs tenggat',
    skala: {
      5: '≥ 3 hari lebih awal dari tenggat',
      4.5: '1–2 hari lebih awal',
      4: 'tepat di hari tenggat',
      3.5: 'telat 1–2 hari',
      3: 'telat > 2 hari',
    },
  },
  teknis: {
    judul: '3. Kemampuan Teknis',
    sumber: '⚙️ otomatis — 60% kecepatan + 40% kompletitas tugas',
    skala: {
      5: 'kumpulkan cepat & lengkap — 100% tugas selesai',
      4.5: '≥ 80% tugas selesai',
      4: '≥ 60% tugas selesai',
      3.5: '≥ 40% tugas selesai',
      3: '< 40% tugas selesai',
    },
  },
  komunikasi: {
    judul: '4. Komunikasi Interpersonal',
    sumber: '🧑‍🏫 dinilai mentor',
    skala: {
      5: 'Sangat baik — mampu berkolaborasi, mendengarkan aktif, menyampaikan ide dengan persuasif.',
      4: 'Mampu berkomunikasi dengan jelas & efektif, mampu menerima masukan.',
      3: 'Cukup baik — terkadang kurang jelas.',
    },
  },
  kualitas: {
    judul: '5. Kualitas Hasil Kerja',
    sumber: '⚙️ otomatis — rata-rata nilai projek (A–E) dari mentor',
    skala: {
      5: 'Hasil kerja berkualitas baik — minim kesalahan, sesuai target.',
      4: 'Kualitas cukup — masih ada beberapa kesalahan, namun sesuai target.',
      3: 'Hasil kerja tidak sesuai target.',
    },
  },
  disiplin: {
    judul: '6. Kedisiplinan dan Etika',
    sumber: '⚙️ otomatis — kalkulasi presensi & keterlambatan',
    skala: {
      5: '≥ 96% kehadiran tanpa keterlambatan',
      4.5: '≥ 90% kehadiran',
      4: '≥ 85% kehadiran',
      3.5: '≥ 80% kehadiran',
      3: '< 80% kehadiran',
    },
  },
};

const badgeNilai = (v) => {
  if (v == null) return 'bg-slate-200 text-slate-500';
  if (v >= 4.8) return 'bg-emerald-500 text-white';
  if (v >= 4.3) return 'bg-green-500 text-white';
  if (v >= 3.8) return 'bg-amber-400 text-amber-900';
  if (v >= 3.3) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
};

export default function Penilaian() {
  const { user } = useAuth();
  const { mentees, loading } = useMentor();
  const [internId, setInternId] = useState('');
  const [periode, setPeriode] = useState(bulanSekarang);
  const [inisiatif, setInisiatif] = useState('');
  const [komunikasi, setKomunikasi] = useState('');
  const [kualitasManual, setKualitasManual] = useState('');
  const [catatan, setCatatan] = useState('');
  const [auto, setAuto] = useState(null);
  const [autoError, setAutoError] = useState(null);
  const [mode, setMode] = useState('insert');
  const [riwayat, setRiwayat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);
  const [rincianBuka, setRincianBuka] = useState(false);
  const [infoBuka, setInfoBuka] = useState(false); // ⭐ modal indikator

  useEffect(() => { if (!loading) muatRiwayat(); }, [loading]);

  async function muatRiwayat() {
    if (mentees.length === 0) return setRiwayat([]);
    const { data } = await supabase.from('rubric_scores')
      .select('*, interns(nama_lengkap)')
      .in('intern_id', mentees.map((m) => m.id))
      .order('periode', { ascending: false });
    setRiwayat(data ?? []);
  }

  async function pilih(iid) {
    setInternId(iid);
    setInisiatif(''); setKomunikasi(''); setKualitasManual(''); setCatatan('');
    setAuto(null); setAutoError(null); setMode('insert'); setPesan(null); setRincianBuka(false);
    if (!iid) return;

    const m = mentees.find((x) => x.id === iid);
    const periodeBaru = m
      ? ((m.tanggal_mulai <= HARI_INI && HARI_INI < m.tanggal_selesai)
          ? HARI_INI.slice(0, 7) : m.tanggal_mulai.slice(0, 7))
      : HARI_INI.slice(0, 7);
    setPeriode(periodeBaru);

    const { data: a, error: errA } = await supabase.rpc('get_auto_penilaian', { p_intern_id: iid });
    if (errA) setAutoError(errA.message); else setAuto(a);

    const { data: ex } = await supabase.from('rubric_scores').select('*')
      .eq('intern_id', iid).eq('periode', periodeBaru).maybeSingle();
    if (ex) {
      setMode('update');
      if (ex.nilai_inisiatif != null) setInisiatif(String(ex.nilai_inisiatif));
      if (ex.nilai_komunikasi != null) setKomunikasi(String(ex.nilai_komunikasi));
      setCatatan(ex.catatan_mentor ?? '');
    }
  }

  async function ubahPeriode(p) {
    setPeriode(p);
    if (!internId) return;
    setMode('insert'); setInisiatif(''); setKomunikasi(''); setCatatan('');
    const { data: ex } = await supabase.from('rubric_scores').select('*')
      .eq('intern_id', internId).eq('periode', p).maybeSingle();
    if (ex) {
      setMode('update');
      if (ex.nilai_inisiatif != null) setInisiatif(String(ex.nilai_inisiatif));
      if (ex.nilai_komunikasi != null) setKomunikasi(String(ex.nilai_komunikasi));
      setCatatan(ex.catatan_mentor ?? '');
    }
  }

  const terpilih = mentees.find((m) => m.id === internId) ?? null;
  const belumMulai = terpilih && terpilih.tanggal_mulai > HARI_INI;
  const selesaiMagang = terpilih && terpilih.tanggal_selesai <= HARI_INI;

  const disiplin = auto?.disiplin?.nilai ?? null;
  const pemecahan = auto?.pemecahan?.nilai ?? null;
  const teknis = auto?.teknis?.nilai ?? null;
  const kualitasAuto = auto?.kualitas?.nilai ?? null;
  const adaProjek = auto?.kualitas?.ada_projek ?? false;
  const kualitasFinal = kualitasAuto ?? (adaProjek ? null : (kualitasManual ? Number(kualitasManual) : null));

  const semuaAda = Boolean(inisiatif) && Boolean(komunikasi) &&
    [disiplin, pemecahan, teknis, kualitasFinal].every((v) => v !== null);

  const soft = semuaAda ? ((Number(inisiatif) + Number(komunikasi) + disiplin) / 3) * 20 : null;
  const hard = semuaAda ? ((pemecahan + teknis + kualitasFinal) / 3) * 20 : null;
  const kehadiran = auto?.disiplin?.kehadiran ?? null;
  const akhir = semuaAda && kehadiran !== null
    ? Math.round((kehadiran * 0.3 + soft * 0.3 + hard * 0.4) * 100) / 100 : null;
  const totalAspek = semuaAda
    ? Math.round((Number(inisiatif) + Number(komunikasi) + pemecahan + teknis + kualitasFinal + disiplin) * 10) / 10
    : null;

  const radarLive = semuaAda ? {
    inisiatif: Number(inisiatif), pemecahan, teknis,
    komunikasi: Number(komunikasi), kualitas: kualitasFinal, disiplin,
  } : null;

  async function simpan(e) {
    e.preventDefault();
    setPesan(null);
    if (!internId) return;
    if (!semuaAda) {
      const alasan = !inisiatif ? 'Isi nilai Inisiatif.'
        : !komunikasi ? 'Isi nilai Komunikasi Interpersonal.'
        : (kualitasFinal === null && adaProjek) ? 'Nilai dulu projeknya (A–E) di Kelompok Binaan.'
        : pemecahan === null ? 'Belum ada subtugas selesai ber-tenggat.'
        : disiplin === null ? 'Presensi belum berjalan.'
        : 'Lengkapi semua aspek terlebih dahulu.';
      return setPesan({ tipe: 'err', teks: '⚠️ ' + alasan });
    }
    setBusy(true);
    const payload = {
      nilai_inisiatif: Number(inisiatif),
      nilai_komunikasi: Number(komunikasi),
      nilai_pemecahan: pemecahan,
      nilai_teknis: teknis,
      nilai_kualitas: kualitasFinal,
      nilai_disiplin: disiplin,
      catatan_mentor: catatan.trim() || null,
    };
    try {
      if (mode === 'update') {
        const { error } = await supabase.from('rubric_scores').update(payload)
          .eq('intern_id', internId).eq('periode', periode);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('rubric_scores').insert({
          intern_id: internId, mentor_id: user.id, periode, ...payload,
        });
        if (error) throw new Error(error.message);
        setMode('update');
      }
      setPesan({ tipe: 'ok', teks: '✅ Penilaian tersimpan.' });
      await muatRiwayat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
    </div>
  );

  const PilihManual = ({ nilai, onPilih }) => (
    <div className="flex items-center gap-1.5">
      {[3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onPilih(String(n))}
          className={`h-9 w-11 rounded-lg border-2 text-sm font-bold transition active:scale-95 ${
            Number(nilai) === n
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}>
          {n}
        </button>
      ))}
    </div>
  );

  const Baris = ({ no, label, kanan, delay }) => (
    <div className="anim-up flex items-center justify-between gap-3 border-b border-slate-50 py-3"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="w-4 shrink-0 text-[11px] font-bold text-slate-300">{no}</span>
        <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
      </div>
      {kanan}
    </div>
  );

  return (
    <div>
      <div className="anim-up flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Rubrik Penilaian</h1>

        {/* ⭐ TOMBOL INFO INDIKATOR */}
        <button onClick={() => setInfoBuka(true)}
          className="btn-press flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100">
          <span className="text-sm">ℹ️</span> Indikator Penilaian
        </button>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* ===== pilih peserta & periode ===== */}
      <div className="anim-up mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 [animation-delay:80ms]">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Peserta</label>
          <select value={internId} onChange={(e) => pilih(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none">
            <option value="">Pilih peserta…</option>
            {mentees.map((m) => <option key={m.id} value={m.id}>{m.nama_lengkap}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Periode</label>
          <input type="month" value={periode} onChange={(e) => ubahPeriode(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" />
        </div>
      </div>

      {/* ===== banner periode ===== */}
      {terpilih && (
        <div className={`anim-up mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 px-4 py-3 [animation-delay:120ms] ${
          belumMulai ? 'border-amber-400 bg-amber-50' : selesaiMagang ? 'border-slate-300 bg-slate-50' : 'border-indigo-400 bg-indigo-50'}`}>
          <p className="text-[13px] font-semibold text-slate-700">
            📅 {fmtTanggal(terpilih.tanggal_mulai)} – {fmtTanggal(terpilih.tanggal_selesai)}
            <span className="ml-1.5 font-normal text-slate-400">
              ({terpilih.durasi_magang} {terpilih.satuan_durasi ?? 'bulan'})
            </span>
          </p>
          <span className={`text-[11px] font-bold ${
            belumMulai ? 'text-amber-600' : selesaiMagang ? 'text-slate-400' : 'text-indigo-600'}`}>
            {belumMulai ? '⚠️ belum mulai' : selesaiMagang ? '✓ selesai' : '● berjalan'}
          </span>
        </div>
      )}

      {internId && autoError && (
        <p className="anim-down mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          ⚠️ Gagal memuat penilaian otomatis: <b>{autoError}</b>
        </p>
      )}

      {/* ===== FORM 6 ASPEK ===== */}
      {internId && (
        <div className="anim-up mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm [animation-delay:160ms]">
          <div className="px-5 pt-2">
            <Baris no="1" label="Inisiatif" delay={0}
              kanan={<PilihManual nilai={inisiatif} onPilih={setInisiatif} />} />
            <Baris no="2" label="Kemampuan Pemecahan Masalah" delay={50}
              kanan={pemecahan != null
                ? <span className={`inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg text-sm font-extrabold ${badgeNilai(pemecahan)}`}>{pemecahan}</span>
                : <span className="text-[11px] font-semibold text-amber-500">menunggu tugas</span>} />
            <Baris no="3" label="Kemampuan Teknis" delay={100}
              kanan={teknis != null
                ? <span className={`inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg text-sm font-extrabold ${badgeNilai(teknis)}`}>{teknis}</span>
                : <span className="text-[11px] font-semibold text-amber-500">menunggu tugas</span>} />
            <Baris no="4" label="Komunikasi Interpersonal" delay={150}
              kanan={<PilihManual nilai={komunikasi} onPilih={setKomunikasi} />} />
            {(kualitasAuto !== null || adaProjek) ? (
              <Baris no="5" label="Kualitas Hasil Kerja" delay={200}
                kanan={kualitasAuto != null
                  ? <span className={`inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg text-sm font-extrabold ${badgeNilai(kualitasAuto)}`}>{kualitasAuto}</span>
                  : <span className="text-[11px] font-semibold text-amber-500">nilai projek dulu</span>} />
            ) : (
              <Baris no="5" label="Kualitas Hasil Kerja" delay={200}
                kanan={<PilihManual nilai={kualitasManual} onPilih={setKualitasManual} />} />
            )}
            <Baris no="6" label="Kedisiplinan dan Etika" delay={250}
              kanan={disiplin != null
                ? <span className={`inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg text-sm font-extrabold ${badgeNilai(disiplin)}`}>{disiplin}</span>
                : <span className="text-[11px] font-semibold text-amber-500">menunggu presensi</span>} />
          </div>

          {/* rincian perhitungan */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <button onClick={() => setRincianBuka(!rincianBuka)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-indigo-600">
              <span className={`inline-block transition-transform ${rincianBuka ? 'rotate-90' : ''}`}>▶</span>
              Rincian perhitungan
            </button>
            {rincianBuka && auto && (
              <div className="anim-down mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Kehadiran', `${auto.disiplin?.kehadiran ?? '—'}%`],
                  ['Terlambat', `${auto.disiplin?.terlambat ?? 0}×`],
                  ['Tugas selesai', `${auto.teknis?.selesai ?? 0}/${auto.teknis?.total ?? 0}`],
                  ['Kecepatan rata²', auto.pemecahan?.nilai ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-slate-100">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                    <p className="mt-0.5 text-sm font-extrabold text-slate-700">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== pratinjau + radar ===== */}
      {internId && (
        <div className="anim-up mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5 [animation-delay:220ms]">
          <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800">{totalAspek ?? '—'}<span className="text-sm text-slate-400">/30</span></p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Soft</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600">{soft != null ? Math.round(soft * 10) / 10 : '—'}</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hard</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">{hard != null ? Math.round(hard * 10) / 10 : '—'}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-4 text-center text-white shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-200">Est. Akhir</p>
              <p className="mt-1 text-2xl font-extrabold">{akhir ?? '—'}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
            {radarLive ? <RadarNilai nilai={radarLive} />
              : <p className="py-10 text-center text-xs text-slate-300">Diagram jaring muncul saat 6 aspek lengkap</p>}
          </div>
        </div>
      )}

      {/* ===== simpan ===== */}
      {internId && (
        <form onSubmit={simpan} className="anim-up mt-4 [animation-delay:280ms]">
          <textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan mentor (opsional)…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none" />
          <button type="submit" disabled={busy || !semuaAda}
            className="btn-press mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:w-auto sm:px-8">
            {busy ? 'Menyimpan…' : mode === 'update' ? 'Perbarui Penilaian' : 'Simpan Penilaian'}
          </button>
        </form>
      )}

      {/* ================= RIWAYAT ================= */}
      <h2 className="anim-up mt-10 text-base font-bold text-slate-800 [animation-delay:320ms]">📚 Riwayat Penilaian</h2>

      {riwayat.length === 0 ? (
        <div className="anim-up mt-3 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">⭐</p>
          <p className="mt-4 font-bold text-slate-600">Belum Ada Penilaian</p>
          <p className="mt-1 text-sm text-slate-400">Nilai binaanmu lewat form di atas</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {riwayat.map((r, i) => {
            const keys = ['nilai_inisiatif','nilai_pemecahan','nilai_teknis','nilai_komunikasi','nilai_kualitas','nilai_disiplin'];
            const NAMA = ['Inisiatif','Pemecahan Masalah','Kemampuan Teknis','Komunikasi','Kualitas Hasil Kerja','Kedisiplinan & Etika'];
            const total = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
            return (
              <div key={r.id}
                className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                style={{ animationDelay: `${350 + i * 80}ms` }}>
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                      {r.interns?.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{r.interns?.nama_lengkap}</p>
                      <p className="text-[11px] font-medium text-slate-400">Periode {r.periode}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-extrabold leading-none text-slate-800">
                      {total ? total.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">dari 30</p>
                  </div>
                </div>

                {/* 6 aspek — nama utuh */}
                <div className="mt-3 space-y-1 pl-2">
                  {keys.map((k, j) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-slate-500">{NAMA[j]}</span>
                      <span className={`inline-flex h-6 min-w-[2.4rem] items-center justify-center rounded-md px-2 text-[11px] font-extrabold ${badgeNilai(Number(r[k]))}`}>
                        {r[k] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {r.catatan_mentor && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic leading-relaxed text-slate-500">
                    💬 "{r.catatan_mentor}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ⭐ MODAL INDIKATOR PENILAIAN ================= */}
      <Modal open={infoBuka} onClose={() => setInfoBuka(false)} title="ℹ️ Indikator Penilaian — 6 Aspek">
        <div className="space-y-4">
          <p className="rounded-xl bg-indigo-50 px-4 py-3 text-[11px] font-medium leading-relaxed text-indigo-700">
            Skala penilaian 3–5 per aspek. Aspek bertanda ⚙️ dihitung otomatis oleh sistem,
            aspek 🧑‍🏫 dinilai langsung oleh mentor.
          </p>

          {Object.entries(INDIKATOR).map(([key, aspek], i) => (
            <div key={key}
              className="anim-up rounded-xl border border-slate-100 bg-slate-50/60 p-4"
              style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-sm font-extrabold text-slate-800">{aspek.judul}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                  aspek.sumber.includes('otomatis')
                    ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {aspek.sumber}
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {Object.entries(aspek.skala).map(([nilai, ket]) => (
                  <div key={nilai} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 inline-flex h-6 min-w-[2.2rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-extrabold ${badgeNilai(Number(nilai))}`}>
                      {nilai}
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-600">{ket}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-center text-[10px] text-slate-400">
            💡 Rumus nilai akhir: (Kehadiran × 0.3) + (Soft × 0.3) + (Hard × 0.4)
          </p>
        </div>
      </Modal>
    </div>
  );
}