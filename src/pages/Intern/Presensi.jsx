import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';
import { CountUp } from '../../components/Skeleton';

const tanggalWib = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const JAM_BUKA_CHECKIN = 8;
const JAM_BUKA_CHECKOUT = 17;

const BADGE = {
  Hadir: 'bg-emerald-500',
  Izin: 'bg-blue-500',
  Sakit: 'bg-amber-400',
  Alpha: 'bg-red-500',
};
const KOTAK = [
  { key: 'Hadir', ikon: '✅', warna: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { key: 'Izin', ikon: '📝', warna: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { key: 'Sakit', ikon: '🤒', warna: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { key: 'Alpha', ikon: '❌', warna: 'bg-red-50 hover:bg-red-100 border-red-200' },
];

const jamWib = (iso) => new Date(iso).toLocaleTimeString('id-ID',
  { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const durasi = (a, b) => {
  const m = Math.floor((new Date(b) - new Date(a)) / 60000);
  return `${Math.floor(m / 60)}j ${m % 60}m`;
};
const jamSekarangWib = () =>
  parseInt(new Intl.DateTimeFormat('id-ID',
    { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }
  ).format(new Date()), 10);

function jarakMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ambilLokasi() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error('Browser kamu tidak mendukung GPS.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? '📍 Izinkan akses lokasi di browser untuk melakukan presensi.'
          : 'Gagal mengambil lokasi GPS — coba lagi.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export default function Presensi() {
  const HARI_INI = tanggalWib();
  const { intern, loading } = useIntern();
  const [hariIni, setHariIni] = useState(null);
  const [stats, setStats] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [izinList, setIzinList] = useState([]);
  const [kantor, setKantor] = useState(null);
  const [pulangAwal, setPulangAwal] = useState(null);
  const [modalAwal, setModalAwal] = useState(false);
  const [alasanAwal, setAlasanAwal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [bukaKotak, setBukaKotak] = useState(null);

  useEffect(() => {
    supabase.from('kantor').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => setKantor(data));
  }, []);
  useEffect(() => { if (intern) muat(); }, [intern]);

  async function muat() {
    const [a, s, r, pa, lz] = await Promise.all([
      supabase.from('attendance').select('*')
        .eq('intern_id', intern.id).eq('tanggal_presensi', HARI_INI).maybeSingle(),
      supabase.rpc('get_attendance_stats', { p_intern_id: intern.id }),
      supabase.from('attendance').select('*')
        .eq('intern_id', intern.id).order('tanggal_presensi', { ascending: false }).limit(180),
      supabase.from('early_checkouts').select('*')
        .eq('intern_id', intern.id).eq('tanggal', HARI_INI).maybeSingle(),
      supabase.from('leave_requests').select('jenis_izin, tanggal_mulai, tanggal_selesai, alasan, status_izin')
        .eq('intern_id', intern.id).eq('status_izin', 'Approved'),
    ]);
    setHariIni(a.data ?? null);
    setStats(s.data ?? null);
    setRiwayat(r.data ?? []);
    setPulangAwal(pa.data ?? null);
    setIzinList(lz.data ?? []);
  }

  // ⭐ Helper — cek izin Telat/WFH approved untuk tanggal tertentu (dipakai di UI)
  const izinTelatAktif = (tanggal) =>
    izinList.some((l) => l.jenis_izin === 'Terlambat' && tanggal >= l.tanggal_mulai && tanggal <= l.tanggal_selesai);
  const izinWFHAktif = (tanggal) =>
    izinList.some((l) => l.jenis_izin === 'WFH' && tanggal >= l.tanggal_mulai && tanggal <= l.tanggal_selesai);

  const alasanIzinDi = (tanggal) => {
    const z = izinList.find((l) => l.jenis_izin !== 'Terlambat' && l.jenis_izin !== 'WFH'
      && tanggal >= l.tanggal_mulai && tanggal <= l.tanggal_selesai);
    return z ? `${z.jenis_izin}: ${z.alasan}` : null;
  };

  async function validasiLokasi() {
    const pos = await ambilLokasi();
    let jarak = null;
    if (kantor) {
      jarak = jarakMeter(pos.lat, pos.lng, Number(kantor.latitude), Number(kantor.longitude));
      if (jarak > kantor.radius_meter)
        throw new Error(`📍 Presensi gagal: kamu ±${Math.round(jarak)} m dari kantor (maksimal ${kantor.radius_meter} m).`);
    }
    return { pos, jarak };
  }

  async function checkIn() {
  setError(null);
  setInfo(null);

  if (jamSekarangWib() < JAM_BUKA_CHECKIN) {
    return setError('⏰ Check-in baru dibuka pukul 08:00 WIB.');
  }

  setBusy(true);

  try {
    const wfh = izinList.some(
      (l) =>
        l.jenis_izin === 'WFH' &&
        l.status_izin === 'Approved' &&
        HARI_INI >= l.tanggal_mulai &&
        HARI_INI <= l.tanggal_selesai
    );

    const izinTelat = izinList.some(
      (l) =>
        l.jenis_izin === 'Terlambat' &&
        l.status_izin === 'Approved' &&
        HARI_INI >= l.tanggal_mulai &&
        HARI_INI <= l.tanggal_selesai
    );

    let pos = null;
    let jarak = null;

    // Normal / izin terlambat tetap wajib berada di kantor.
    // WFH tidak perlu mengambil GPS.
    if (!wfh) {
      const hasilLokasi = await validasiLokasi();
      pos = hasilLokasi.pos;
      jarak = hasilLokasi.jarak;
    }

    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        intern_id: intern.id,
        tanggal_presensi: HARI_INI,
        check_in: new Date().toISOString(),
        status_kehadiran: 'Hadir',
        latitude: pos?.lat ?? null,
        longitude: pos?.lng ?? null,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    await muat();

    if (wfh) {
      setInfo('✅ Check-in WFH tercatat — presensi dari luar kantor diizinkan.');
    } else if (izinTelat) {
      setInfo(
        `✅ Check-in tercatat${
          jarak !== null ? ` — jarak ${Math.round(jarak)} m` : ''
        } · ⏰ Izin Telat aktif — tanpa penalti.`
      );
    } else {
      setInfo(
        `✅ Check-in tercatat${
          jarak !== null ? ` — jarak ${Math.round(jarak)} m` : ''
        }.`
      );
    }
  } catch (e) {
    console.error('Presensi check-in gagal:', e);
    setError(e.message);
  } finally {
    setBusy(false);
  }
}

  async function checkOut() {
  setError(null);
  setInfo(null);

  // #12: Logbook wajib sebelum checkout
  const { data: logbookHariIni } = await supabase
    .from('logbook')
    .select('id')
    .eq('intern_id', intern.id)
    .eq('tanggal', HARI_INI)
    .maybeSingle();

  if (!logbookHariIni) {
    setError(
      '📖 Isi logbook hari ini dulu sebelum check-out! Klik menu Logbook untuk menulis catatan kerjamu.'
    );
    return;
  }

  const bolehAwal = pulangAwal?.status === 'Approved';
  const wfh = izinWFHAktif(HARI_INI);

  if (jamSekarangWib() < JAM_BUKA_CHECKOUT && !bolehAwal && !wfh) {
    return setError(
      '⏰ Check-out baru dibuka 17:00 WIB — atau ajukan Pulang Awal / WFH.'
    );
  }

  setBusy(true);

  try {
    let pos = null;
    let jarak = null;

    // Normal & pulang awal tetap wajib GPS kantor.
    // WFH tidak perlu GPS.
    if (!wfh) {
      const hasilLokasi = await validasiLokasi();
      pos = hasilLokasi.pos;
      jarak = hasilLokasi.jarak;
    }

    const { error } = await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        checkout_latitude: pos?.lat ?? null,
        checkout_longitude: pos?.lng ?? null,
      })
      .eq('id', hariIni.id);

    if (error) throw new Error(error.message);

    await muat();

    setInfo(
      `🏁 Check-out tercatat${
        bolehAwal && jamSekarangWib() < 17
          ? ' (Pulang Awal)'
          : wfh
            ? ' (WFH)'
            : ''
      }${jarak !== null ? ` — jarak ${Math.round(jarak)} m` : ''}.`
    );
  } catch (e) {
    console.error('Presensi check-out gagal:', e);
    setError(e.message);
  } finally {
    setBusy(false);
  }
}

  async function ajukanPulangAwal(e) {
    e.preventDefault();
    setError(null);
    if (!alasanAwal.trim()) return setError('Tuliskan alasan pulang awal.');
    setBusy(true);
    const { error } = await supabase.from('early_checkouts').insert({
      intern_id: intern.id,
      tanggal: HARI_INI,
      alasan: alasanAwal.trim(),
    });
    if (error) setError(error.message);
    else {
      setModalAwal(false); setAlasanAwal('');
      setInfo('📨 Pengajuan Pulang Awal terkirim — menunggu konfirmasi admin.');
    }
    await muat();
    setBusy(false);
  }

  if (loading) return (
    <div>
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="mt-6 skeleton h-48 rounded-2xl" />
      <div className="mt-4 skeleton h-64 rounded-2xl" />
    </div>
  );

  const belumMulai = intern.tanggal_mulai > HARI_INI;
  const masaSelesai = intern.tanggal_selesai <= HARI_INI;
  const persen = stats?.persen_kehadiran;
  const persenTampil = persen === null || persen === undefined;
  const bolehAwal = pulangAwal?.status === 'Approved';
  const wfh = izinWFHAktif(HARI_INI);
  const telatIzin = izinTelatAktif(HARI_INI);
  const sudahJam5 = jamSekarangWib() >= JAM_BUKA_CHECKOUT;

  if (belumMulai) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Presensi</h1>
        </div>
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center shadow sm:p-12">
          <p className="anim-float text-5xl">🔒</p>
          <h2 className="mt-3 text-lg font-bold text-slate-700">Presensi Belum Tersedia</h2>
          <p className="mt-2 text-sm text-slate-500">
            Masa magangmu dimulai pada <b>{fmtTanggal(intern.tanggal_mulai)}</b>.
          </p>
        </div>
      </div>
    );
  }

  const riwayatKotak = (status) => riwayat.filter((r) => r.status_kehadiran === status);

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Presensi</h1>
      </div>

      {error && <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium leading-relaxed text-red-600">{error}</p>}
      {info && <p className="anim-down mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium leading-relaxed text-green-700">{info}</p>}

      {/* ===== Kartu hari ini ===== */}
      <div className="anim-up relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-5 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />

        <p className="relative text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-200">
          Hari ini — {fmtTanggal(HARI_INI)}
        </p>

        {masaSelesai ? (
          <p className="relative mt-3 text-lg font-bold">Masa magangmu telah selesai. Terima kasih! 🎓</p>
        ) : !hariIni ? (
          <>
            <p className="relative mt-2.5 text-xl font-extrabold sm:text-2xl">Belum check-in ⏰</p>
            <p className="relative mt-1 text-[11px] font-medium text-indigo-200">
              Check-in 08:00 · toleransi 08:05 · {kantor ? `radius ${kantor.radius_meter} m` : 'radius kantor'}
            </p>
            <button onClick={checkIn} disabled={busy || jamSekarangWib() < JAM_BUKA_CHECKIN}
              className="btn-press anim-pulse-ring relative mt-4 w-full rounded-xl bg-white py-4 text-base font-extrabold text-indigo-700 shadow-lg transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-64">
              {jamSekarangWib() < JAM_BUKA_CHECKIN ? '🔒 Dibuka pukul 08:00' : busy ? 'Memproses…' : '✅ CHECK-IN SEKARANG'}
            </button>
          </>
        ) : !hariIni.check_out ? (
          <>
            <p className="relative mt-2.5 text-xl font-extrabold sm:text-2xl">
              Sedang bekerja sejak {jamWib(hariIni.check_in)} 💪
            </p>

            {/* ⭐ Badge izin aktif */}
            {wfh && (
              <p className="relative mt-2 inline-block rounded-xl bg-green-400/30 px-3 py-1.5 text-xs font-bold text-green-100">
                🏠 WFH Aktif — presensi dari mana saja
              </p>
            )}
            {telatIzin && (
              <p className="relative mt-2 inline-block rounded-xl bg-orange-400/30 px-3 py-1.5 text-xs font-bold text-orange-100">
                ⏰ Izin Telat — tanpa penalti keterlambatan
              </p>
            )}
            {hariIni.menit_terlambat != null && (
              <p className="relative mt-2 inline-block rounded-xl bg-orange-500/30 px-2.5 py-1 text-xs font-bold text-orange-200">
                ⚠ terlambat {hariIni.menit_terlambat} menit
              </p>
            )}

            {pulangAwal && pulangAwal.status !== 'Approved' && (
              <p className={`relative mt-2 rounded-xl px-3 py-2 text-[11px] font-bold ${
                pulangAwal.status === 'Pending' ? 'bg-amber-400/25 text-amber-100' : 'bg-red-400/25 text-red-100'}`}>
                {pulangAwal.status === 'Pending' && '⏳ Pengajuan pulang awal menunggu konfirmasi admin.'}
                {pulangAwal.status === 'Rejected' && '❌ Pulang awal ditolak — check-out tetap 17:00.'}
              </p>
            )}

            <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
              <button onClick={checkOut}
                disabled={busy || (!sudahJam5 && !bolehAwal && !wfh)}
                className="btn-press w-full rounded-xl bg-white py-4 text-base font-extrabold text-orange-600 shadow-lg transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8">
                {busy ? 'Memproses…'
                  : bolehAwal && !sudahJam5 ? '🏁 CHECK-OUT (PULANG AWAL)'
                  : wfh && !sudahJam5 ? '🏁 CHECK-OUT'
                  : sudahJam5 ? '🏁 CHECK-OUT' : '🔒 Dibuka 17:00'}
              </button>
              {!pulangAwal && !sudahJam5 && !wfh && (
                <button onClick={() => setModalAwal(true)}
                  className="btn-press w-full rounded-xl border-2 border-white/40 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto sm:px-6">
                  🏃 Pulang Awal
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="relative mt-2.5 text-lg font-extrabold sm:text-xl">✅ Hari ini selesai!</p>
            <div className="relative mt-3 flex items-center justify-center gap-3 rounded-xl bg-white/10 py-3 backdrop-blur">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-200">Masuk</p>
                <p className="text-xl font-extrabold">{jamWib(hariIni.check_in)}</p>
              </div>
              <span className="text-indigo-300">→</span>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-200">Keluar</p>
                <p className="text-xl font-extrabold">{jamWib(hariIni.check_out)}</p>
              </div>
              <span className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-bold">
                {durasi(hariIni.check_in, hariIni.check_out)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ===== Statistik ===== */}
      {stats && !stats.error && (
        persenTampil ? (
          <div className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-slate-500">
              📊 Statistik akan mulai dihitung ketika masa magang berjalan.
            </p>
          </div>
        ) : (
          <div className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Persentase Kehadiran</p>
                <p className={`text-4xl font-extrabold ${persen >= 85 ? 'text-green-600' : 'text-red-500'}`}>
                  <CountUp value={persen} suffix="%" />
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                persen >= 85 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{stats.status}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`anim-bar h-full rounded-full ${persen >= 85 ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(persen, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-slate-400">
              Target {stats.target_persen}% — toleransi {stats.toleransi_hari ?? 0} hari
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {KOTAK.map((k, i) => {
                const aktif = bukaKotak === k.key;
                return (
                  <button key={k.key} onClick={() => setBukaKotak(aktif ? null : k.key)}
                    className={`anim-pop rounded-xl border-2 p-3 text-center transition active:scale-[0.97] ${k.warna} ${
                      aktif ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
                    style={{ animationDelay: `${200 + i * 60}ms` }}>
                    <p className="text-xl">{k.ikon}</p>
                    <b className="text-lg">
                      <CountUp value={stats[k.key.toLowerCase()] ?? 0} />
                    </b>
                    <p className="text-[11px] font-semibold text-slate-500">{k.key}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">{aktif ? '▲ tutup' : '▼ detail'}</p>
                  </button>
                );
              })}
            </div>

            {bukaKotak && (
              <div className="anim-down mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Riwayat {bukaKotak} — {riwayatKotak(bukaKotak).length} entri
                </p>
                {riwayatKotak(bukaKotak).length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Belum ada riwayat {bukaKotak.toLowerCase()}.</p>
                ) : (
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {riwayatKotak(bukaKotak).map((r) => (
                      <div key={r.id} className="anim-in flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                        <span className="font-bold text-slate-700">📅 {fmtTanggal(r.tanggal_presensi)}</span>
                        {bukaKotak === 'Hadir' && (
                          <span className="text-[11px] leading-relaxed text-slate-500">
                            🕗 {r.check_in ? jamWib(r.check_in) : '—'} → {r.check_out ? jamWib(r.check_out) : '—'}
                            {r.check_in && r.check_out && ` (${durasi(r.check_in, r.check_out)})`}
                            {r.menit_terlambat != null && (
                              <span className="ml-1 font-bold text-orange-500">⚠ +{r.menit_terlambat}m</span>
                            )}
                          </span>
                        )}
                        {(bukaKotak === 'Izin' || bukaKotak === 'Sakit') && (
                          <span className="text-[11px] leading-relaxed text-slate-500">
                            💬 {alasanIzinDi(r.tanggal_presensi) ?? 'disetujui admin'}
                          </span>
                        )}
                        {bukaKotak === 'Alpha' && (
                          <span className="text-[11px] text-slate-400">tanpa presensi</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {Number(stats.terlambat ?? 0) > 0 && (
              <p className="mt-3 text-center text-xs font-bold text-orange-500">
                ⚠️ Terlambat {stats.terlambat}× · rata-rata {stats.rata_menit_terlambat ?? 0} menit
              </p>
            )}
          </div>
        )
      )}

      {/* ===== Riwayat ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800">🕘 Riwayat 15 Hari Terakhir</h2>
      <div className="anim-up mt-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2.5 sm:px-4">Tanggal</th>
              <th className="px-3 py-2.5 sm:px-4">Masuk</th>
              <th className="px-3 py-2.5 sm:px-4">Keluar</th>
              <th className="px-3 py-2.5 sm:px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {riwayat.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center">
                <div className="flex flex-col items-center">
                  <p className="anim-float text-4xl">📭</p>
                  <p className="mt-2 text-sm text-slate-400">Belum ada riwayat</p>
                </div>
              </td></tr>
            ) : riwayat.slice(0, 15).map((r) => (
              <tr key={r.id} className="anim-in border-b border-slate-50">
                <td className="px-3 py-2.5 font-bold text-slate-600 sm:px-4">{fmtTanggal(r.tanggal_presensi)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                  {r.check_in ? jamWib(r.check_in) : '—'}
                  {r.menit_terlambat != null && (
                    <span className="ml-1 text-[10px] font-bold text-orange-500">⚠ +{r.menit_terlambat}m</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">{r.check_out ? jamWib(r.check_out) : '—'}</td>
                <td className="px-3 py-2.5 sm:px-4">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white ${BADGE[r.status_kehadiran]}`}>
                    {r.status_kehadiran.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Modal Pulang Awal ===== */}
      <Modal open={modalAwal} onClose={() => setModalAwal(false)} title="🏃 Ajukan Pulang Awal">
        <form onSubmit={ajukanPulangAwal}>
          <p className="text-sm leading-relaxed text-slate-600">
            Pengajuan ini akan <b>dikonfirmasi oleh admin</b>. Jika disetujui, kamu bisa
            check-out sebelum pukul 17:00 dan presensimu tetap dihitung <b>Hadir</b>.
          </p>
          <textarea value={alasanAwal} onChange={(e) => setAlasanAwal(e.target.value)} rows={3}
            placeholder="Alasan pulang lebih awal… (wajib diisi)"
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-orange-500 focus:outline-none" />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setModalAwal(false)}
              className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={busy}
              className="btn-press rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">
              {busy ? 'Mengirim…' : 'Kirim Pengajuan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}