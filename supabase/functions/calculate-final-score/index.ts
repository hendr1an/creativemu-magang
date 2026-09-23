// =====================================================================
// FUNGSI   : calculate-final-score (PRD 3.5 — kalkulasi kelulusan)
// AKSES    : ADMIN atau INTERNAL (service_role) → verify_jwt = ON
// METHOD   : POST { "intern_id": "<uuid>" }  → proses SATU peserta
//            POST {}                           → proses SEMUA peserta
//                                               yang masa magangnya habis
// RUMUS    : Nilai Akhir = (%Kehadiran × 0.3) + (SoftSkill × 0.3)
//                              + (HardSkill × 0.4)
//            LULUS jika %Kehadiran >= 85 DAN Nilai Akhir >= 70
//            (semua bobot configurable via Secrets)
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const W_ABSEN = parseFloat(Deno.env.get('WEIGHT_ABSENSI') ?? '0.3');
const W_SOFT  = parseFloat(Deno.env.get('WEIGHT_SOFT')   ?? '0.3');
const W_HARD  = parseFloat(Deno.env.get('WEIGHT_HARD')   ?? '0.4');
const MIN_KEHADIRAN = parseFloat(Deno.env.get('MIN_KEHADIRAN') ?? '85');
const MIN_NILAI     = parseFloat(Deno.env.get('MIN_NILAI')     ?? '70');

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

function fmtTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

async function authorizeAdminAtauService(req: Request): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return false;
  if (token === SERVICE_ROLE_KEY) return true; // panggilan internal/cron
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin';
}

async function triggerDispatch(): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 10 }),
    });
  } catch (_e) { /* antrean tetap aman, diproses cron */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Gunakan method POST.' }, 405);
  if (!(await authorizeAdminAtauService(req))) return json({ error: 'Tidak diizinkan.' }, 401);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const internId = typeof body.intern_id === 'string' ? body.intern_id : null;
    const today = new Date().toISOString().slice(0, 10);

    // ---------- Tentukan target ----------
    let targets: Record<string, unknown>[] = [];
    if (internId) {
      const { data, error } = await supabase
        .from('interns').select('*').eq('id', internId).single();
      if (error || !data) return json({ error: 'Peserta magang tidak ditemukan.' }, 404);
      if (data.status_magang === 'Completed' && data.nilai_final != null) {
        return json(
          { error: 'Peserta ini sudah diproses sebelumnya.', nilai_final: data.nilai_final },
          409,
        );
      }
      targets = [data];
    } else {
      const { data } = await supabase
        .from('interns')
        .select('*')
        .eq('status_magang', 'Active')
        .lte('tanggal_selesai', today); // masa magang sudah berakhir
      targets = (data ?? []) as Record<string, unknown>[];
    }

    if (targets.length === 0) {
      return json({ success: true, diproses: 0, hasil: [], info: 'Tidak ada peserta yang memenuhi kriteria.' });
    }

    const hasil: Record<string, unknown>[] = [];

    for (const intern of targets) {
      const id = String(intern.id);

      // ---- 1. Statistik kehadiran (SQL function Bagian 1, real-time) ----
      const { data: stats } = await supabase.rpc('get_attendance_stats', { p_intern_id: id });
      if (stats?.error) { hasil.push({ intern_id: id, error: stats.message }); continue; }
      const persenKehadiran = stats?.persen_kehadiran as number | null;
      if (persenKehadiran === null || persenKehadiran === undefined) {
        hasil.push({ intern_id: id, nama: intern.nama_lengkap, dilewati: 'Belum ada hari kerja tercatat.' });
        continue;
      }

      // ---- 2. Rata-rata rubrik (soft skill + hard skill) ----
      const { data: rubrik } = await supabase
        .from('rubric_scores')
        .select('nilai_soft_skill, nilai_hard_skill')
        .eq('intern_id', id);
      if (!rubrik || rubrik.length === 0) {
        hasil.push({ intern_id: id, nama: intern.nama_lengkap, dilewati: 'Belum ada nilai rubrik dari pembimbing.' });
        continue;
      }
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const soft = Math.round(avg(rubrik.map((r) => Number(r.nilai_soft_skill))) * 100) / 100;
      const hard = Math.round(avg(rubrik.map((r) => Number(r.nilai_hard_skill))) * 100) / 100;

      // ---- 3. Nilai akhir + status kelulusan ----
      const nilaiFinal =
        Math.round((persenKehadiran * W_ABSEN + soft * W_SOFT + hard * W_HARD) * 100) / 100;
      const lulus = persenKehadiran >= MIN_KEHADIRAN && nilaiFinal >= MIN_NILAI;

      // ---- 4. Simpan & tandai program selesai ----
      const { error: updErr } = await supabase
        .from('interns')
        .update({ nilai_final: nilaiFinal, status_magang: 'Completed' })
        .eq('id', id);
      if (updErr) { hasil.push({ intern_id: id, error: updErr.message }); continue; }

      // ---- 5. Notifikasi hasil ke peserta ----
      const tglMulai = fmtTanggal(String(intern.bulan_mulai));
      const tglSelesai = fmtTanggal(
        new Date(new Date(String(intern.tanggal_selesai)).getTime() - 86400000).toISOString(),
      );
      const judul = '🏆 Penilaian Akhir Magang — Creativemu Academy';
      const pesan = [
        `🏆 *PENILAIAN AKHIR MAGANG — Creativemu Academy*`,
        ``,
        `Hai ${intern.nama_lengkap},`,
        ``,
        `Masa magangmu (${tglMulai} s.d. ${tglSelesai}) telah selesai. Berikut rekap penilaianmu:`,
        ``,
        `📊 Kehadiran   : ${persenKehadiran}% (target ${MIN_KEHADIRAN}%)`,
        `⭐ Soft Skill  : ${soft}`,
        `💻 Hard Skill  : ${hard}`,
        `🎯 Nilai Akhir : ${nilaiFinal}`,
        ``,
        `Status Kelulusan: *${lulus ? 'LULUS 🎉' : 'TIDAK LULUS'}*`,
        ``,
        lulus
          ? 'Selamat! Kamu berhak atas sertifikat magang Creativemu Academy. Silakan unduh di dashboard kamu. 🎓'
          : 'Nilai/kehadiranmu belum memenuhi syarat kelulusan. Hubungi pembimbing untuk informasi lebih lanjut.',
        ``,
        `Terima kasih atas dedikasimu selama program ini! 🙏`,
        ``,
        `— Creativemu Academy, Sedayu`,
      ].join('\n');

      const rows = [
        { user_id: intern.user_id, channel: 'whatsapp',
          recipient_phone: (intern.nomor_whatsapp as string) ?? null, judul, pesan },
        { user_id: intern.user_id, channel: 'email',
          recipient_email: (intern.email as string) ?? null, judul, pesan },
      ].filter((r) => (r.channel === 'whatsapp' ? !!r.recipient_phone : !!r.recipient_email));
      if (rows.length) await supabase.from('notifications').insert(rows);

      hasil.push({
        intern_id: id, nama: intern.nama_lengkap,
        persen_kehadiran: persenKehadiran,
        soft_skill: soft, hard_skill: hard,
        nilai_final: nilaiFinal, lulus,
      });
    }

    await triggerDispatch();

    return json({
      success: true,
      diproses: hasil.length,
      bobot: { absensi: W_ABSEN, soft_skill: W_SOFT, hard_skill: W_HARD,
               min_kehadiran: MIN_KEHADIRAN, min_nilai: MIN_NILAI },
      hasil,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Kesalahan internal.' }, 500);
  }
});