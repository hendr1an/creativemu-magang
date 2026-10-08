
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, CalendarDays,
  Check, CheckCircle2, Clock3, FileText,
  House, Paperclip, ShieldCheck, ShieldAlert,
  X, ArrowRight, RefreshCw, ChevronDown,
  MessageSquareText,
} from 'lucide-react';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';

const FILTERS = ['Pending', 'Approved', 'Rejected', 'Semua'];

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-100',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Rejected: 'bg-red-50 text-red-700 border-red-100',
};

const MOTION_CSS = `
@keyframes cmEnter {
  from { opacity:0; transform:translateY(15px) scale(.985); filter:blur(3px); }
  to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
}
@keyframes cmPop {
  0% { opacity:0; transform:scale(.93); }
  75% { opacity:1; transform:scale(1.02); }
  100% { opacity:1; transform:scale(1); }
}
@keyframes cmSlide {
  from { opacity:0; transform:translateY(-5px); }
  to { opacity:1; transform:translateY(0); }
}
.cm-enter {
  animation:cmEnter .46s cubic-bezier(.2,.8,.2,1) both;
}
.cm-pop {
  animation:cmPop .36s cubic-bezier(.2,.8,.2,1) both;
}
.cm-slide {
  animation:cmSlide .25s ease both;
}
.cm-card {
  transition:transform .25s cubic-bezier(.2,.8,.2,1),
    box-shadow .25s ease,border-color .25s ease;
}
.cm-card:hover {
  transform:translateY(-3px);
  border-color:rgba(99,102,241,.23);
  box-shadow:0 18px 42px rgba(15,23,42,.07);
}
.cm-button {
  transition:transform .17s ease,background-color .2s ease,
    box-shadow .2s ease;
}
.cm-button:not(:disabled):hover { transform:translateY(-1px); }
.cm-button:not(:disabled):active { transform:scale(.97); }
.cm-expand {
  display:grid;
  grid-template-rows:0fr;
  opacity:0;
  transition:grid-template-rows .3s ease,opacity .3s ease;
}
.cm-expand.open {
  grid-template-rows:1fr;
  opacity:1;
}
.cm-expand > div { overflow:hidden; }
@media(prefers-reduced-motion:reduce) {
  .cm-enter,.cm-pop,.cm-slide {
    animation:none!important;
  }
  .cm-card,.cm-button,.cm-expand {
    transition:none!important;
  }
  .cm-card:hover,.cm-button:hover,.cm-button:active {
    transform:none!important;
  }
}
`;

function labelJenis(jenis) {
  return jenis === 'Terlambat' ? 'Izin Telat' : jenis;
}

function IkonJenis({ jenis }) {
  if (jenis === 'Sakit') return <span>🤒</span>;
  if (jenis === 'WFH') return <House size={17} />;
  if (jenis === 'Terlambat') return <Clock3 size={17} />;

  return <FileText size={17} />;
}

function isOverlap(a, b) {
  if (!a || !b) return false;

  return (
    a.tanggal_mulai <= b.tanggal_selesai &&
    a.tanggal_selesai >= b.tanggal_mulai
  );
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

function tanggalRentang(mulai, selesai) {
  if (!mulai) return '-';

  if (!selesai || mulai === selesai) {
    return fmtTanggal(mulai);
  }

  return `${fmtTanggal(mulai)} – ${fmtTanggal(selesai)}`;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_STYLES[status] ||
        'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}

function EmptyState({ type, filter }) {
  const leave = type === 'leave';

  return (
    <div className="cm-enter flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#FCFCFE] px-5 py-8 text-center">

      <div
        className={`cm-pop flex h-14 w-14 items-center justify-center rounded-2xl ${
          leave
            ? 'bg-indigo-50 text-indigo-500'
            : 'bg-orange-50 text-orange-500'
        }`}
      >
        {leave ? (
          <FileText size={25} strokeWidth={1.6} />
        ) : (
          <CalendarDays size={25} strokeWidth={1.6} />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-700">
        Tidak ada pengajuan
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {filter === 'Semua'
          ? leave
            ? 'Belum ada pengajuan izin, sakit, WFH, atau izin telat.'
            : 'Belum ada pengajuan pulang awal yang tercatat.'
          : `Tidak ada pengajuan dengan status ${filter} untuk kategori ini.`}
      </p>

    </div>
  );
}

export default function Izin() {
  const { user } = useAuth();

  const [daftar, setDaftar] = useState([]);
  const [izinAktif, setIzinAktif] = useState([]);
  const [pulang, setPulang] = useState([]);

  const [filter, setFilter] = useState('Pending');
  const [catatan, setCatatan] = useState({});

  const [busyId, setBusyId] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [expandedRequest, setExpandedRequest] = useState(null);
  const [expandedEarly, setExpandedEarly] = useState(null);

  useEffect(() => {
    muatSemua();
  }, [filter]);

  async function muatSemua() {
    setLoading(true);

    try {
      const izinQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          interns(id, nama_lengkap, instansi)
        `)
        .order('created_at', { ascending: false });

      const pulangQuery = supabase
        .from('early_checkouts')
        .select(`
          *,
          interns(nama_lengkap)
        `)
        .order('created_at', { ascending: false });

      const [izinResult, aktifResult, pulangResult] =
        await Promise.all([
          filter === 'Semua'
            ? izinQuery
            : izinQuery.eq('status_izin', filter),

          supabase
            .from('leave_requests')
            .select(`
              id, intern_id, jenis_izin, tanggal_mulai,
              tanggal_selesai, status_izin, created_at
            `)
            .in('status_izin', ['Pending', 'Approved'])
            .order('created_at', { ascending: false }),

          filter === 'Semua'
            ? pulangQuery
            : pulangQuery.eq('status', filter),
        ]);

      const err =
        izinResult.error ||
        aktifResult.error ||
        pulangResult.error;

      if (err) throw err;

      setDaftar(izinResult.data ?? []);
      setIzinAktif(aktifResult.data ?? []);
      setPulang(pulangResult.data ?? []);
      setPesan(null);
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal memuat pengajuan.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function muatIzin() {
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        interns(id, nama_lengkap, instansi)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'Semua') {
      query = query.eq('status_izin', filter);
    }

    const { data, error } = await query;

    if (error) throw error;

    setDaftar(data ?? []);
  }

  async function muatIzinAktif() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        id, intern_id, jenis_izin, tanggal_mulai,
        tanggal_selesai, status_izin, created_at
      `)
      .in('status_izin', ['Pending', 'Approved'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    setIzinAktif(data ?? []);
  }

  async function muatPulang() {
    let query = supabase
      .from('early_checkouts')
      .select(`
        *,
        interns(nama_lengkap)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'Semua') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) throw error;

    setPulang(data ?? []);
  }

  // Conflict map tetap membaca semua izin Pending & Approved.

  const conflictMap = useMemo(() => {
    const result = {};

    daftar.forEach((row) => {
      result[row.id] = izinAktif.filter(
        (other) =>
          other.id !== row.id &&
          other.intern_id === row.intern_id &&
          isOverlap(row, other)
      );
    });

    return result;
  }, [daftar, izinAktif]);

  function getConflictInfo(row) {
    const conflicts = conflictMap[row.id] ?? [];

    const approved = conflicts.filter(
      (item) => item.status_izin === 'Approved'
    );

    const pending = conflicts.filter(
      (item) => item.status_izin === 'Pending'
    );

    return {
      approved,
      pending,
      hardConflict: approved.length > 0,
      softConflict:
        approved.length === 0 && pending.length > 0,
    };
  }

  async function cekApprovedConflict(row) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        id, jenis_izin, tanggal_mulai,
        tanggal_selesai, status_izin
      `)
      .eq('intern_id', row.intern_id)
      .eq('status_izin', 'Approved')
      .neq('id', row.id)
      .lte('tanggal_mulai', row.tanggal_selesai)
      .gte('tanggal_selesai', row.tanggal_mulai)
      .limit(1);

    if (error) {
      throw new Error(
        `Gagal memeriksa konflik izin: ${error.message}`
      );
    }

    return data?.[0] ?? null;
  }

  async function prosesIzin(row, status) {
    if (busyId) return;

    setBusyId(row.id);
    setPesan(null);

    try {
      if (status === 'Approved') {
        const conflict = await cekApprovedConflict(row);

        if (conflict) {
          throw new Error(
            `${row.interns?.nama_lengkap ?? 'Peserta'} sudah memiliki ` +
            `${labelJenis(conflict.jenis_izin)} berstatus Approved ` +
            `pada periode ${tanggalRentang(
              conflict.tanggal_mulai,
              conflict.tanggal_selesai
            )}. Pengajuan ini tidak dapat disetujui.`
          );
        }
      }

      const { data: updated, error } = await supabase
        .from('leave_requests')
        .update({
          status_izin: status,
          reviewed_by: user.id,
          catatan_reviewer: catatan[row.id]?.trim() || null,
        })
        .eq('id', row.id)
        .eq('status_izin', 'Pending')
        .select('id');

      if (error) throw error;

      if (!updated?.length) {
        throw new Error(
          'Pengajuan sudah diproses. Muat ulang data.'
        );
      }

      let successText;

      if (status === 'Rejected') {
        successText =
          `Pengajuan ${labelJenis(row.jenis_izin)} ` +
          `${row.interns?.nama_lengkap ?? ''} ditolak.`;
      } else if (row.jenis_izin === 'WFH') {
        successText =
          `WFH ${row.interns?.nama_lengkap ?? ''} disetujui. ` +
          'Peserta dapat presensi tanpa batas lokasi sesuai aturan WFH.';
      } else if (row.jenis_izin === 'Terlambat') {
        successText =
          `Izin telat ${row.interns?.nama_lengkap ?? ''} disetujui. ` +
          'Check-in tetap mengikuti batas jam dan lokasi yang berlaku, tanpa penalti keterlambatan.';
      } else {
        successText =
          `${labelJenis(row.jenis_izin)} ` +
          `${row.interns?.nama_lengkap ?? ''} disetujui.`;
      }

      setCatatan((previous) => {
        const next = { ...previous };
        delete next[row.id];
        return next;
      });

      await Promise.all([muatIzin(), muatIzinAktif()]);

      setPesan({
        tipe: 'ok',
        teks: successText,
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Pengajuan gagal diproses.',
      });

      try {
        await Promise.all([muatIzin(), muatIzinAktif()]);
      } catch (refreshError) {
        console.error('Gagal memuat ulang data izin:', refreshError);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function prosesPulang(row, status) {
    if (busyId) return;

    setBusyId(row.id);
    setPesan(null);

    try {
      const { data: updated, error } = await supabase
        .from('early_checkouts')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('status', 'Pending')
        .select('id');

      if (error) throw error;

      if (!updated?.length) {
        throw new Error(
          'Pengajuan sudah diproses. Muat ulang data.'
        );
      }

      await muatPulang();

      setPesan({
        tipe: 'ok',
        teks:
          status === 'Approved'
            ? `Pulang awal ${row.interns?.nama_lengkap ?? ''} disetujui.`
            : `Pengajuan pulang awal ${row.interns?.nama_lengkap ?? ''} ditolak.`,
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal memproses pulang awal.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function lihatBukti(path) {
    try {
      const url = await buatUrlFile(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal membuka bukti.',
      });
    }
  }

  function gantiFilter(next) {
    if (next === filter) return;

    setExpandedRequest(null);
    setExpandedEarly(null);
    setFilter(next);
  }

  return (
    <div className="space-y-6 pb-8">
      <style>{MOTION_CSS}</style>

      {/* HEADER */}

      <header className="cm-enter flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Persetujuan Izin
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Kelola izin, sakit, WFH, izin telat, dan pulang awal peserta magang.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || !!busyId}
          onClick={muatSemua}
          className="cm-button inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>

      </header>

      {/* LEAVE CONFLICT GUARD */}

      <div
        className="cm-enter flex items-start gap-3 rounded-2xl border border-indigo-100 bg-[#F5F6FF] px-4 py-4 sm:px-5"
        style={{ animationDelay: '70ms' }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
          <ShieldCheck size={20} />
        </div>

        <div>
          <p className="text-sm font-semibold text-indigo-800">
            Leave Conflict Guard aktif
          </p>

          <p className="mt-1 text-xs leading-5 text-indigo-600">
            Hanya satu pengajuan pada periode yang bertabrakan dapat
            berstatus Approved. Sistem memberi peringatan dan
            database menjadi pengaman terakhir.
          </p>
        </div>
      </div>

      {/* NOTIFICATIONS */}

      {pesan && (
        <div
          role={pesan.tipe === 'err' ? 'alert' : 'status'}
          className={`cm-pop flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p className="flex items-start gap-2">
            {pesan.tipe === 'ok' ? (
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
            )}
            {pesan.teks}
          </p>

          <button
            type="button"
            onClick={() => setPesan(null)}
            aria-label="Tutup pesan"
            className="cm-button"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ANIMATED SEGMENTED FILTER */}

      <div className="cm-enter overflow-x-auto" style={{ animationDelay: '110ms' }}>
        <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-slate-200 bg-[#F1F2F6] p-1">

          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => gantiFilter(item)}
              disabled={!!busyId}
              className={`cm-button min-w-[95px] rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-300 disabled:opacity-50 ${
                filter === item
                  ? 'bg-white text-indigo-700 shadow-[0_3px_10px_rgba(15,23,42,0.10)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item}
            </button>
          ))}

        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-60 rounded-3xl" />
          <div className="skeleton h-48 rounded-3xl" />
        </div>
      ) : (
        <>

          {/* LEAVE SECTION */}

          <section className="cm-enter overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText size={19} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    Izin, Sakit, WFH & Izin Telat
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Daftar permohonan peserta magang
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {daftar.length} pengajuan
              </span>
            </div>

            <div className="p-4 sm:p-5">

              {daftar.length === 0 ? (
                <EmptyState type="leave" filter={filter} />
              ) : (
                <div className="space-y-3">

                  {daftar.map((row, index) => {
                    const conflict = getConflictInfo(row);
                    const pending = row.status_izin === 'Pending';
                    const processing = busyId === row.id;
                    const expanded = expandedRequest === row.id;

                    return (
                      <article
                        key={row.id}
                        className={`cm-enter cm-card rounded-[18px] border p-4 sm:p-5 ${
                          pending && conflict.hardConflict
                            ? 'border-red-200 bg-red-50/20'
                            : pending && conflict.softConflict
                              ? 'border-amber-200 bg-amber-50/20'
                              : 'border-slate-200 bg-white'
                        }`}
                        style={{
                          animationDelay: `${Math.min(index * 65, 400)}ms`,
                        }}
                      >

                        {/* REQUEST HEADER */}

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div className="flex min-w-0 items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                              {initials(row.interns?.nama_lengkap)}
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {row.interns?.nama_lengkap || 'Peserta'}
                                </p>

                                <StatusBadge status={row.status_izin} />
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                                <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                  <IkonJenis jenis={row.jenis_izin} />
                                  {labelJenis(row.jenis_izin)}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays size={13} />
                                  {tanggalRentang(
                                    row.tanggal_mulai,
                                    row.tanggal_selesai
                                  )}
                                </span>

                              </div>

                              {row.interns?.instansi && (
                                <p className="mt-2 text-xs text-slate-400">
                                  {row.interns.instansi}
                                </p>
                              )}
                            </div>
                          </div>

                          {row.bukti_url && (
                            <button
                              type="button"
                              onClick={() => lihatBukti(row.bukti_url)}
                              className="cm-button inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                            >
                              <Paperclip size={14} />
                              Lihat Bukti
                            </button>
                          )}

                        </div>

                        {/* EXPAND / COLLAPSE REASON */}

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRequest((current) =>
                              current === row.id ? null : row.id
                            )
                          }
                          aria-expanded={expanded}
                          aria-controls={`leave-detail-${row.id}`}
                          className="cm-button mt-4 flex w-full items-center justify-between rounded-xl bg-[#F8F9FB] px-4 py-3 text-left"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <MessageSquareText size={16} className="text-indigo-500" />
                            {expanded ? 'Tutup rincian' : 'Lihat alasan pengajuan'}
                          </span>

                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-300 ${
                              expanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div
                          id={`leave-detail-${row.id}`}
                          className={`cm-expand ${expanded ? 'open' : ''}`}
                          aria-hidden={!expanded}
                        >
                          <div>
                            <div className="border-b border-slate-100 px-4 py-3">
                              <p className="text-[11px] font-medium text-slate-400">
                                Alasan pengajuan
                              </p>

                              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">
                                {row.alasan || '-'}
                              </p>

                              {!pending && row.catatan_reviewer && (
                                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                  <p className="text-[11px] font-medium text-slate-400">
                                    Catatan reviewer
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">
                                    {row.catatan_reviewer}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* HARD CONFLICT — ALWAYS VISIBLE */}

                        {pending && conflict.hardConflict && (
                          <div className="cm-slide mt-3 rounded-xl border border-red-200 bg-red-50 p-4">

                            <div className="flex items-start gap-2">
                              <ShieldAlert
                                size={17}
                                className="mt-0.5 shrink-0 text-red-600"
                              />

                              <div>
                                <p className="text-xs font-semibold text-red-700">
                                  Pengajuan tidak dapat disetujui
                                </p>

                                <p className="mt-1 text-xs leading-5 text-red-600">
                                  Sudah ada izin Approved dengan periode
                                  yang bertabrakan.
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {conflict.approved.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-lg bg-white px-3 py-2 text-xs text-red-700"
                                >
                                  <b>{labelJenis(item.jenis_izin)}</b>
                                  {' · '}
                                  {tanggalRentang(
                                    item.tanggal_mulai,
                                    item.tanggal_selesai
                                  )}
                                </div>
                              ))}
                            </div>

                            <p className="mt-3 text-[11px] text-red-600">
                              Pengajuan ini masih dapat ditolak,
                              tetapi tidak dapat di-approve.
                            </p>
                          </div>
                        )}

                        {/* SOFT CONFLICT — ALWAYS VISIBLE */}

                        {pending && conflict.softConflict && (
                          <div className="cm-slide mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                            <div className="flex items-start gap-2">
                              <AlertTriangle
                                size={17}
                                className="mt-0.5 shrink-0 text-amber-600"
                              />

                              <div>
                                <p className="text-xs font-semibold text-amber-800">
                                  Ada pengajuan Pending yang bertabrakan
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                  Admin boleh menyetujui salah satu pengajuan.
                                  Setelah disetujui, pengajuan lain yang
                                  bertabrakan tidak dapat di-approve.
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {conflict.pending.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-lg bg-white px-3 py-2 text-xs text-amber-800"
                                >
                                  <b>{labelJenis(item.jenis_izin)}</b>
                                  {' · '}
                                  {tanggalRentang(
                                    item.tanggal_mulai,
                                    item.tanggal_selesai
                                  )}
                                </div>
                              ))}
                            </div>

                          </div>
                        )}

                        {/* DECISION ACTIONS — ALWAYS VISIBLE */}

                        {pending && (
                          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center">

                            <input
                              type="text"
                              value={catatan[row.id] ?? ''}
                              onChange={(e) =>
                                setCatatan((previous) => ({
                                  ...previous,
                                  [row.id]: e.target.value,
                                }))
                              }
                              placeholder="Catatan untuk peserta (opsional)"
                              aria-label={`Catatan untuk ${row.interns?.nama_lengkap ?? 'peserta'}`}
                              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />

                            <div className="flex gap-2">

                              <button
                                type="button"
                                onClick={() => prosesIzin(row, 'Rejected')}
                                disabled={!!busyId}
                                className="cm-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 lg:flex-none"
                              >
                                <X size={15} />
                                Tolak
                              </button>

                              <button
                                type="button"
                                onClick={() => prosesIzin(row, 'Approved')}
                                disabled={!!busyId || conflict.hardConflict}
                                title={
                                  conflict.hardConflict
                                    ? 'Ada izin Approved yang bertabrakan'
                                    : 'Setujui pengajuan'
                                }
                                className="cm-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:flex-none"
                              >
                                {processing ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                ) : (
                                  <Check size={15} />
                                )}
                                Setujui
                              </button>

                            </div>
                          </div>
                        )}

                      </article>
                    );
                  })}

                </div>
              )}

            </div>
          </section>

          {/* EARLY CHECKOUT */}

          <section
            className="cm-enter overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
            style={{ animationDelay: '90ms' }}
          >

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ArrowRight size={19} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    Pulang Awal
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Pengajuan check-out sebelum 17:00
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {pulang.length} pengajuan
              </span>

            </div>

            <div className="p-4 sm:p-5">

              {pulang.length === 0 ? (
                <EmptyState type="early" filter={filter} />
              ) : (
                <div className="space-y-3">

                  {pulang.map((row, index) => {
                    const expanded = expandedEarly === row.id;

                    return (
                      <article
                        key={row.id}
                        className="cm-enter cm-card rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5"
                        style={{
                          animationDelay: `${Math.min(index * 65, 400)}ms`,
                        }}
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex min-w-0 items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                              {initials(row.interns?.nama_lengkap)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {row.interns?.nama_lengkap || 'Peserta'}
                                </p>

                                <StatusBadge status={row.status} />
                              </div>

                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                                <CalendarDays size={13} />
                                {fmtTanggal(row.tanggal)}
                              </p>
                            </div>

                          </div>

                          {row.status === 'Pending' && (
                            <div className="flex shrink-0 gap-2">

                              <button
                                type="button"
                                onClick={() => prosesPulang(row, 'Rejected')}
                                disabled={!!busyId}
                                className="cm-button inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 sm:flex-none"
                              >
                                <X size={14} />
                                Tolak
                              </button>

                              <button
                                type="button"
                                onClick={() => prosesPulang(row, 'Approved')}
                                disabled={!!busyId}
                                className="cm-button inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:flex-none"
                              >
                                {busyId === row.id ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Setujui
                              </button>

                            </div>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEarly((current) =>
                              current === row.id ? null : row.id
                            )
                          }
                          aria-expanded={expanded}
                          aria-controls={`early-detail-${row.id}`}
                          className="cm-button mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <MessageSquareText size={15} className="text-orange-500" />
                            {expanded ? 'Tutup alasan' : 'Lihat alasan pulang awal'}
                          </span>

                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-300 ${
                              expanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div
                          id={`early-detail-${row.id}`}
                          className={`cm-expand ${expanded ? 'open' : ''}`}
                          aria-hidden={!expanded}
                        >
                          <div>
                            <p className="px-4 py-3 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                              {row.alasan || '-'}
                            </p>
                          </div>
                        </div>

                      </article>
                    );
                  })}

                </div>
              )}

            </div>
          </section>

        </>
      )}

    </div>
  );
}
