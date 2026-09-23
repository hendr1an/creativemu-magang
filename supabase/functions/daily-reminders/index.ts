// =====================================================================
// FUNGSI   : daily-reminders (PRD 3.6 — pengingat otomatis)
// AKSES    : INTERNAL (service_role / admin / CRON_SECRET) → verify_jwt = ON
// DIJALANKAN pg_cron: setiap hari kerja 08:30 WIB (01:30 UTC)
// TUGAS    : (1) Pengingat check-in utk intern aktif yang belum presensi
//            (2) Pengingat jadwal mentoring hari ini per kelompok
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

async function authorize(req: Request): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (token && token === SERVICE_ROLE_KEY) return true;
  const secret = req.headers.get('x-cron-secret');
  if (secret && secret === Deno.env.get('CRON_SECRET')) return true;
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (p?.role === 'admin') return true;
    }
  }
  return false;
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^0-9]/g, '');
  if (!p) return null;
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (!p.startsWith('62')) p = '62' + p;
  return p;
}

function fmtTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

async function triggerDispatch(): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 50 }),
    });
  } catch (_e) { /* antrean diproses cron */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Gunakan method POST.' }, 405);
  if (!(await authorize(req))) return json({ error: 'Tidak diizinkan.' }, 401);

  try {
    // Hari "versi WIB" (WIB = UTC+7, tanpa DST)
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const hariIni = wib.toISOString().slice(0, 10);
    const isWeekday = [1, 2, 3, 4, 5].includes(wib.getUTCDay());
    const jamWib = wib.toISOString().slice(11, 16);

    let jumlahPresensi = 0;
    let jumlahMentoring = 0;

    // ============ 1. PENGINGAT PRESENSI (hanya hari kerja) ============
    if (isWeekday) {
      const { data: aktif } = await supabase
        .from('interns')
        .select('id, user_id, nama_lengkap, nomor_whatsapp')
        .eq('status_magang', 'Active')
        .lte('bulan_mulai', hariIni)
        .gt('tanggal_selesai', hariIni);

      if (aktif && aktif.length > 0) {
        const ids = aktif.map((i) => i.id);

        // Siapa yang sudah punya baris presensi hari ini?
        const { data: hadir } = await supabase
          .from('attendance').select('intern_id')
          .eq('tanggal_presensi', hariIni).in('intern_id', ids);
        const sudahPresensi = new Set((hadir ?? []).map((r) => r.intern_id));

        // Cegah duplikat pengingat (cron/manual double-run, window 14 jam)
        const { data: sudahDiberi } = await supabase
          .from('notifications').select('user_id')
          .eq('judul', '⏰ Pengingat Presensi')
          .gte('created_at', new Date(Date.now() - 14 * 3600 * 1000).toISOString());
        const sudahDiberiSet = new Set((sudahDiberi ?? []).map((r) => r.user_id));

        const belum = aktif.filter(
          (i) => !sudahPresensi.has(i.id) && !sudahDiberiSet.has(i.user_id),
        );

        const rows = belum
          .map((i) => ({
            user_id: i.user_id,
            channel: 'whatsapp',
            recipient_phone: normalizePhone(i.nomor_whatsapp),
            judul: '⏰ Pengingat Presensi',
            pesan: `⏰ *Pengingat Presensi*\n\nHai ${i.nama_lengkap}, pukul ${jamWib} WIB kamu *belum check-in* hari ini (${fmtTanggal(hariIni)}).\n\nTarget kehadiran minimal 85% — yuk check-in sekarang! 💪\n\n— Creativemu Academy`,
          }))
          .filter((r) => !!r.recipient_phone);

        if (rows.length) {
          const { error } = await supabase.from('notifications').insert(rows);
          if (!error) jumlahPresensi = rows.length;
        }
      }
    }

    // ============ 2. PENGINGAT JADWAL MENTORING HARI INI ============
    const awalHariWib = new Date(`${hariIni}T00:00:00+07:00`);
    const akhirHariWib = new Date(awalHariWib.getTime() + 24 * 3600 * 1000);

    const { data: sesiList } = await supabase
      .from('mentoring_schedules')
      .select('id, judul_sesi, tanggal_waktu, platform, link_meeting, group_id, groups(nama_kelompok)')
      .eq('status_sesi', 'Scheduled')
      .gte('tanggal_waktu', new Date().toISOString())   // lewati sesi yang sudah lewat
      .lte('tanggal_waktu', akhirHariWib.toISOString());

    for (const s of sesiList ?? []) {
      const judulNotif = `📅 Pengingat Mentoring (${s.id.slice(0, 8)})`;

      // Cegah duplikat pengingat untuk sesi yang sama
      const { data: dup } = await supabase
        .from('notifications').select('id')
        .eq('judul', judulNotif)
        .gte('created_at', new Date(Date.now() - 14 * 3600 * 1000).toISOString())
        .limit(1);
      if (dup && dup.length > 0) continue;

      const { data: anggota } = await supabase
        .from('interns')
        .select('user_id, nama_lengkap, nomor_whatsapp')
        .eq('group_id', s.group_id)
        .eq('status_magang', 'Active');

      const waktu = new Date(s.tanggal_waktu).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      });
      const namaKelompok = (s.groups as { nama_kelompok?: string } | null)?.nama_kelompok ?? '-';

      const rows = (anggota ?? [])
        .map((a) => ({
          user_id: a.user_id,
          channel: 'whatsapp',
          recipient_phone: normalizePhone(a.nomor_whatsapp),
          judul: judulNotif,
          pesan: `📅 *Pengingat Mentoring*\n\nHai ${a.nama_lengkap}, kelompokmu (${namaKelompok}) punya sesi hari ini:\n\n📌 ${s.judul_sesi}\n🕒 ${waktu} WIB${s.platform ? `\n💻 ${s.platform}` : ''}${s.link_meeting ? `\n🔗 ${s.link_meeting}` : ''}\n\nJangan lupa hadir ya! 🙌\n\n— Creativemu Academy`,
        }))
        .filter((r) => !!r.recipient_phone);

      if (rows.length) {
        const { error } = await supabase.from('notifications').insert(rows);
        if (!error) jumlahMentoring += rows.length;
      }
    }

    await triggerDispatch();

    return json({
      success: true,
      tanggal: hariIni,
      pengingat_presensi: jumlahPresensi,
      pengingat_mentoring: jumlahMentoring,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Kesalahan internal.' }, 500);
  }
});