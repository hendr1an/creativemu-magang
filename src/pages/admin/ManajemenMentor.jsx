import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { fmtTanggal } from '../../lib/format';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function passwordAcak() {
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const angka = '23456789';
  const acak = (set, n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => set[b % set.length]).join('');
  return `${acak(huruf, 4)}${acak(angka, 4)}`;
}

export default function ManajemenMentor() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);
  const [kredensial, setKredensial] = useState(null);

  const [form, setForm] = useState({ nama: '', email: '', wa: '', password: '' });

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(null);

  useEffect(() => { muat(); }, []);

  async function muat() {
    setLoading(true);
    const { data } = await supabase.from('profiles')
      .select('id, nama_lengkap, email, nomor_whatsapp, password_tercatat, created_at')
      .eq('role', 'mentor').order('nama_lengkap');
    setMentors(data ?? []);
    setLoading(false);
  }

  async function panggilEdge(payload) {
    const { data: sesi } = await supabase.auth.getSession();
    const token = sesi?.session?.access_token;
    if (!token) throw new Error('Sesi berakhir — login ulang.');
    const res = await fetch(`${BASE_URL}/functions/v1/kelola-mentor`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const hasil = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(hasil?.error || `Gagal (HTTP ${res.status}).`);
    return hasil;
  }

  async function buat(e) {
    e.preventDefault();
    setPesan(null);
    setBusy(true);
    try {
      const hasil = await panggilEdge({
        aksi: 'buat',
        nama: form.nama, email: form.email,
        nomor_whatsapp: form.wa || undefined,
        password: form.password,
      });
      setKredensial({ nama: form.nama, ...hasil.kredensial });
      setForm({ nama: '', email: '', wa: '', password: '' });
      await muat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  async function kirimReset(e) {
    e.preventDefault();
    if (!resetTarget) return;
    setBusy(true); setPesan(null);
    try {
      const hasil = await panggilEdge({ aksi: 'reset_password', user_id: resetTarget.id, password_baru: resetPw });
      setKredensial({ nama: resetTarget.nama_lengkap, email: resetTarget.email, password: hasil.kredensial.password });
      setResetTarget(null); setResetPw('');
      await muat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  async function hapusMentor() {
    if (!konfirmasiHapus) return;
    setBusy(true); setPesan(null);
    try {
      // hapus akun auth via edge kelola-akun (sudah ada) tidak mendukung hapus —
      // jadi: nonaktifkan via kelola-akun? Untuk konsistensi: gunakan service berikut:
      const { error } = await supabase.functions.invoke('kelola-akun', {
        body: { user_id: konfirmasiHapus.id, aksi: 'nonaktifkan' },
      });
      if (error) throw new Error(error.message);
      setPesan({ tipe: 'ok', teks: `✅ Akun "${konfirmasiHapus.nama_lengkap}" dinonaktifkan. (Hapus permanen via Authentication dashboard bila perlu)` });
      setKonfirmasiHapus(null);
      await muat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  function copy(teks) {
    navigator.clipboard?.writeText(teks);
    setPesan({ tipe: 'ok', teks: '📋 Disalin ke clipboard.' });
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Manajemen Mentor</h1>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* ===== form buat mentor ===== */}
      <form onSubmit={buat}
        className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Buat Akun Mentor Baru</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Lengkap *</label>
            <input required value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              placeholder="mis. Budi Pembimbing"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nomor WhatsApp (opsional)</label>
            <input value={form.wa}
              onChange={(e) => setForm((f) => ({ ...f, wa: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email *</label>
            <input type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="mentor@email.com"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Password *</label>
            <div className="mt-1.5 flex gap-2">
              <input required value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="huruf + angka, min 6"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm focus:border-indigo-500 focus:outline-none" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, password: passwordAcak() }))}
                title="Buat password acak"
                className="btn-press rounded-xl bg-slate-100 px-3.5 text-sm font-bold text-slate-600 hover:bg-slate-200">
                🎲
              </button>
            </div>
          </div>
        </div>
        <button type="submit" disabled={busy}
          className="btn-press mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:w-auto sm:px-8">
          {busy ? 'Membuat…' : 'Buat Akun Mentor'}
        </button>
      </form>

      {/* ===== daftar mentor ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">
        🧑‍🏫 Daftar Mentor ({mentors.length})
      </h2>

      {loading ? (
        <div className="mt-3 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : mentors.length === 0 ? (
        <div className="anim-up mt-3 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">🧑‍🏫</p>
          <p className="mt-4 font-bold text-slate-600">Belum Ada Mentor</p>
          <p className="mt-1 text-sm text-slate-400">Buat akun mentor pertama lewat form di atas</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {mentors.map((m, i) => (
            <div key={m.id}
              className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              style={{ animationDelay: `${200 + i * 90}ms` }}>
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                    {m.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{m.nama_lengkap}</p>
                    <p className="truncate text-[11px] font-medium text-slate-400">{m.email}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      📱 {m.nomor_whatsapp ?? '—'} · bergabung {fmtTanggal(m.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => { setResetTarget(m); setResetPw(passwordAcak()); }}
                    className="btn-press rounded-lg bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-200">
                    🔑 Reset
                  </button>
                </div>
              </div>

              {/* password tercatat */}
              <div className="mt-3 ml-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                {m.password_tercatat ? (
                  <>
                    <code className="font-mono text-xs font-bold text-slate-700">{m.password_tercatat}</code>
                    <button onClick={() => copy(m.password_tercatat)} title="Copy"
                      className="btn-press rounded-md bg-white px-2 py-1 text-[11px] ring-1 ring-slate-200 hover:bg-slate-50">📋</button>
                  </>
                ) : (
                  <span className="text-[11px] italic text-slate-400">password belum tercatat (mentor belum ganti password)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== modal kredensial ===== */}
      <Modal open={!!kredensial} onClose={() => setKredensial(null)} title="🎉 Akun Mentor Siap">
        {kredensial && (
          <div>
            <p className="text-sm leading-relaxed text-slate-600">
              Akun untuk <b>{kredensial.nama}</b> telah dibuat. Salin kredensial berikut dan
              sampaikan ke mentor:
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 font-mono text-sm">
              <p>📧 Email&nbsp;&nbsp;&nbsp;: <b className="break-all">{kredensial.email}</b></p>
              <p>🔑 Password: <b>{kredensial.password}</b></p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => copy(`Email: ${kredensial.email}\nPassword: ${kredensial.password}`)}
                className="btn-press rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">📋 Copy Semua</button>
              <button onClick={() => setKredensial(null)}
                className="btn-press rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700">Selesai</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== modal reset ===== */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`🔑 Reset Password — ${resetTarget?.nama_lengkap ?? ''}`}>
        {resetTarget && (
          <form onSubmit={kirimReset}>
            <p className="text-sm leading-relaxed text-slate-600">
              Tentukan password baru untuk <b>{resetTarget.nama_lengkap}</b> ({resetTarget.email}).
            </p>
            <div className="mt-3 flex gap-2">
              <input required value={resetPw} onChange={(e) => setResetPw(e.target.value)}
                placeholder="huruf + angka, min 6"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm focus:border-amber-500 focus:outline-none" />
              <button type="button" onClick={() => setResetPw(passwordAcak())}
                className="btn-press rounded-xl bg-slate-100 px-3.5 font-bold text-slate-600 hover:bg-slate-200">🎲</button>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setResetTarget(null)}
                className="btn-press rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={busy}
                className="btn-press rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                {busy ? 'Mereset…' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* confirm hapus/nonaktifkan */}
      <ConfirmModal
        open={!!konfirmasiHapus}
        onClose={() => setKonfirmasiHapus(null)}
        onConfirm={hapusMentor}
        busy={busy}
        judul={konfirmasiHapus ? `🔴 Nonaktifkan "${konfirmasiHapus.nama_lengkap}"?` : ''}
        teks="Mentor tidak akan bisa login. Data & relasi kelompok tetap tersimpan."
        teksConfirm="Ya, Nonaktifkan"
        tipe="danger"
      />
    </div>
  );
}