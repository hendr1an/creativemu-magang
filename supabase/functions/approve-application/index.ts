// =====================================================================
// FUNGSI   : approve-application  (⭐ inti PRD 3.2)
// AKSES    : ADMIN SAJA → verify_jwt = ON
// METHOD   : POST { application_id, action: "approve" | "reject", catatan? }
// ALUR     : 1. Verifikasi pemanggil adalah admin
//            2. Pre-check kuota (RPC check_quota)
//            3. Buat akun Auth otomatis + password acak
//            4. Insert tabel interns (dijaga trigger enforce_quota)
//            5. Update status application
//            6. Enqueue notifikasi (WA + Email) & picu worker
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

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

// ---------- Helper: password acak (tanpa karakter ambigu: 0/O/1/l/I) ----------
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

// ---------- Helper: normalisasi nomor WA Indonesia → 62xxxxxxxxxx ----------
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

// ---------- Helper: picu worker notifikasi (fire-and-forget) ----------
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
  } catch (_e) {
    // Gagal pun tidak masalah — antrean diproses cron 5-menitan (opsional) / manual.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Gunakan method POST.' }, 405);

  try {
    // ================= 1. AUTENTIKASI: hanya admin =================
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Token tidak ditemukan.' }, 401);

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return json({ error: 'Token tidak valid.' }, 401);

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return json({ error: 'Hanya admin yang boleh memproses pendaftaran.' }, 403);
    }

    // ================= 2. VALIDASI BODY =================
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const applicationId = String(body.application_id ?? '');
    const action = String(body.action ?? 'approve');
    const catatan = typeof body.catatan === 'string' ? body.catatan.trim() : null;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)) {
      return json({ error: 'application_id tidak valid.' }, 400);
    }
    if (action !== 'approve' && action !== 'reject') {
      return json({ error: "action harus 'approve' atau 'reject'." }, 400);
    }

    // ================= 3. AMBIL DATA PENDAFTARAN =================
    const { data: app, error: appErr } = await supabase
      .from('applications').select('*').eq('id', applicationId).single();
    if (appErr || !app) return json({ error: 'Pengajuan tidak ditemukan.' }, 404);
    if (app.status_pendaftaran !== 'Pending') {
      return json(
        { error: `Pengajuan sudah diproses sebelumnya (status: ${app.status_pendaftaran}).` },
        409,
      );
    }

    // ================= ALUR REJECT =================
    if (action === 'reject') {
      const { error: updErr } = await supabase
        .from('applications')
        .update({
          status_pendaftaran: 'Rejected',
          catatan_admin: catatan,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
      if (updErr) return json({ error: updErr.message }, 500);

      const judul = '📄 Hasil Seleksi Magang Creativemu Academy';
      const pesan = [
        `Hai ${app.nama_lengkap},`,
        ``,
        `Terima kasih sudah mendaftar program magang di Creativemu Academy (Sedayu).`,
        ``,
        `Setelah proses seleksi, dengan berat hati pengajuan magangmu periode ini *belum dapat kami setujui*.`,
        catatan ? `\n📝 Catatan tim: ${catatan}` : '',
        ``,
        `Kamu dipersilakan mendaftar kembali untuk periode berikutnya melalui website kami.`,
        `Tetap semangat berkarya! 🙌`,
        ``,
        `— Creativemu Academy`,
      ].filter((s) => s !== '').join('\n');

      const rows = [
        { user_id: null, application_id: app.id, channel: 'whatsapp',
          recipient_phone: normalizePhone(app.nomor_whatsapp), judul, pesan },
        { user_id: null, application_id: app.id, channel: 'email',
          recipient_email: app.email, judul, pesan },
      ].filter((r) => (r.channel === 'whatsapp' ? !!r.recipient_phone : !!r.recipient_email));

      let peringatan: string | null = null;
      if (rows.length) {
        const { error: insErr } = await supabase.from('notifications').insert(rows);
        if (insErr) peringatan = `Notifikasi gagal masuk antrean: ${insErr.message}`;
        else await triggerDispatch();
      }

      return json({ success: true, status: 'Rejected', peringatan });
    }

    // ================= ALUR APPROVE =================

    // ---- 4. PRE-CHECK KUOTA (algoritma PRD §4) ----
    const { data: quota } = await supabase.rpc('check_quota', {
      p_bulan_mulai: app.bulan_mulai,
      p_durasi: app.durasi_magang,
    });
    if (!quota || quota.error) return json({ error: 'Gagal mengecek kuota.' }, 500);
    if (!quota.tersedia) {
      return json(
        { error: 'Kuota penuh — aksi Approve diblokir.', detail_bulan: quota.detail_bulan },
        409,
      );
    }

    // ---- 5. BUAT AKUN OTOMATIS (username = email, password acak) ----
    const password = generatePassword(12);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: app.email,
      password,
      email_confirm: true, // langsung bisa login (kredensial dikirim via WA/Email)
      user_metadata: {
        nama_lengkap: app.nama_lengkap,
        nomor_whatsapp: app.nomor_whatsapp,
      },
      app_metadata: { role: 'intern' }, // dibaca trigger handle_new_user
    });
    if (createErr || !newUser.user) {
      return json({ error: `Gagal membuat akun: ${createErr?.message}` }, 409);
    }
    const userId = newUser.user.id;

    // ---- 6. INSERT TABEL INTERNS (penjaga terakhir: trigger enforce_quota) ----
    const { data: intern, error: internErr } = await supabase
      .from('interns')
      .insert({
        user_id: userId,
        application_id: app.id,
        nama_lengkap: app.nama_lengkap,
        email: app.email,
        nomor_whatsapp: app.nomor_whatsapp,
        bulan_mulai: app.bulan_mulai,
        durasi_magang: app.durasi_magang,
        status_magang: 'Active',
      })
      .select('id, bulan_mulai, durasi_magang, tanggal_selesai')
      .single();

    if (internErr || !intern) {
      // KOMPENSASI: hapus akun yang barusan dibuat (hindari akun yatim)
      await supabase.auth.admin.deleteUser(userId);
      const msg = internErr?.message ?? '';
      if (msg.toLowerCase().includes('kuota')) {
        // Terjadi race condition antar admin → trigger DB menang
        return json({ error: msg }, 409);
      }
      return json({ error: `Gagal menyimpan data peserta: ${msg}` }, 500);
    }

    // ---- 7. UPDATE STATUS PENDAFTARAN ----
    const { error: updErr } = await supabase
      .from('applications')
      .update({
        status_pendaftaran: 'Approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId);
    if (updErr) {
      // KOMPENSASI penuh: hapus intern + akun
      await supabase.from('interns').delete().eq('id', intern.id);
      await supabase.auth.admin.deleteUser(userId);
      return json({ error: `Gagal memperbarui pengajuan: ${updErr.message}` }, 500);
    }

    // ---- 8. SUSUN PESAN "LOLOS" + ENQUEUE NOTIFIKASI ----
    const tglMulai = fmtTanggal(intern.bulan_mulai);
    const tglSelesai = fmtTanggal(
      new Date(new Date(intern.tanggal_selesai).getTime() - 86400000).toISOString(),
    );

    const judul = '🎉 Selamat! Kamu Lolos Magang di Creativemu Academy';
    const pesan = [
      `🎉 *SELAMAT! Kamu LOLOS MAGANG di Creativemu Academy*`,
      ``,
      `Hai ${app.nama_lengkap},`,
      ``,
      `Pengajuan magangmu telah *DISETUJUI* ✅ Berikut akun resmi kamu:`,
      ``,
      `📧 Email    : ${app.email}`,
      `🔑 Password : ${password}`,
      `🌐 Login    : ${APP_URL}`,
      ``,
      `📅 Periode  : ${tglMulai} s.d. ${tglSelesai} (${app.durasi_magang} bulan)`,
      ``,
      `Setelah login, segera:`,
      `1. Lengkapi profil & nomor WhatsApp kamu`,
      `2. Lakukan *check-in* setiap hari kerja`,
      `3. Pantau tugas di Kanban Board kamu`,
      ``,
      `Simpan pesan ini baik-baik. Selamat bergabung! 🚀`,
      ``,
      `— Creativemu Academy, Sedayu`,
    ].join('\n');

    const notifRows = [
      { user_id: userId, application_id: app.id, channel: 'whatsapp',
        recipient_phone: normalizePhone(app.nomor_whatsapp), judul, pesan },
      { user_id: userId, application_id: app.id, channel: 'email',
        recipient_email: app.email, judul, pesan },
    ].filter((r) => (r.channel === 'whatsapp' ? !!r.recipient_phone : !!r.recipient_email));

    let peringatan: string | null = null;
    if (notifRows.length) {
      const { error: insErr } = await supabase.from('notifications').insert(notifRows);
      if (insErr) peringatan = `Notifikasi gagal masuk antrean: ${insErr.message}`;
    }

    // ---- 9. PICU WORKER PENGIRIMAN ----
    await triggerDispatch();

    return json({
      success: true,
      status: 'Approved',
      intern_id: intern.id,
      user_id: userId,
      kredensial: { email: app.email, password },
      notifikasi: notifRows.length
        ? 'masuk antrean & sedang dikirim'
        : 'tidak ada kanal penerima terdaftar',
      peringatan,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Kesalahan internal.' }, 500);
  }
});