// =====================================================================
// FUNGSI   : send-notifications (QUEUE WORKER)
// AKSES    : INTERNAL (service_role / admin / CRON_SECRET) → verify_jwt = ON
// METHOD   : POST { "limit": 10 }   (default 20, maks 50)
// TUGAS    : Ambil notifikasi berstatus 'Pending' (FIFO) → kirim
//            ke WhatsApp Gateway + Email (Resend) → update status
//            'Sent'/'Failed' + provider_ref + error_message.
//
// KONVENSI API WHATSAPP GATEWAY YANG DIASUMSIKAN (SESUAIKAN!):
//   POST {WA_GATEWAY_URL}
//   Headers : Authorization: Bearer {WA_API_KEY}
//   Body    : { "target": "628xxxxxxxxxx", "message": "..." }
//   Sukses  : HTTP 2xx
//   (Kompatibel pola umum: Fonnte, Wablas, gateway self-hosted, dst.)
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

// ---------- Autorisasi: service_role / CRON_SECRET / admin ----------
async function authorize(req: Request): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (token && token === SERVICE_ROLE_KEY) return true;

  const secret = req.headers.get('x-cron-secret');
  if (secret && secret === Deno.env.get('CRON_SECRET')) return true;

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: p } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (p?.role === 'admin') return true;
    }
  }
  return false;
}

// ---------- Pengiriman WhatsApp ----------
async function sendWhatsApp(phone: string, message: string): Promise<string> {
  const url = Deno.env.get('WA_GATEWAY_URL');
  const key = Deno.env.get('WA_API_KEY');
  if (!url || !key) throw new Error('Secrets WA_GATEWAY_URL / WA_API_KEY belum diisi.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ target: phone, message }),
  });

  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { /* beberapa gateway membalas plain text */ }

  if (!res.ok) throw new Error(`WA HTTP ${res.status}: ${raw.slice(0, 200)}`);

  // Ekstrak referensi pesan dari berbagai bentuk respons gateway umum
  const data = parsed.data as Record<string, unknown> | undefined;
  return String(
    parsed.message_id ?? parsed.id ?? parsed.messageId ?? data?.id ?? crypto.randomUUID(),
  );
}

// ---------- Pengiriman Email via Resend ----------
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmailHtml(text: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f172a;padding:20px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">Creativemu Academy</h2>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Sistem Manajemen Magang — Sedayu</p>
    </div>
    <div style="padding:24px;color:#0f172a;font-size:14px;line-height:1.8;">
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(text)}</pre>
    </div>
    <div style="padding:14px 24px;background:#f8fafc;color:#64748b;font-size:11px;">
      Email otomatis dari sistem manajemen magang Creativemu Academy. Mohon jangan membalas email ini.
    </div>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('FROM_EMAIL') ?? 'Creativemu Academy <onboarding@resend.dev>';
  if (!key) throw new Error('Secret RESEND_API_KEY belum diisi.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html: buildEmailHtml(text) }),
  });

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Email HTTP ${res.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return String(parsed.id ?? crypto.randomUUID());
}

// ================= WORKER =================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Gunakan method POST.' }, 405);
  if (!(await authorize(req))) return json({ error: 'Tidak diizinkan.' }, 401);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const limit = Math.min(Math.max(parseInt(String(body.limit ?? '20'), 10) || 20, 1), 50);

  const { data: queue, error } = await supabase
    .from('notifications')
    .select('id, channel, recipient_email, recipient_phone, judul, pesan')
    .eq('status_kirim', 'Pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return json({ error: error.message }, 500);
  if (!queue || queue.length === 0) return json({ processed: 0, sent: 0, failed: 0 });

  let sent = 0;
  let failed = 0;

  for (const n of queue) {
    try {
      let ref = '';
      if (n.channel === 'whatsapp' && n.recipient_phone) {
        ref = await sendWhatsApp(n.recipient_phone, n.pesan ?? '');
      } else if (n.channel === 'email' && n.recipient_email) {
        ref = await sendEmail(n.recipient_email, n.judul ?? 'Notifikasi Creativemu Academy', n.pesan ?? '');
      } else if (n.channel === 'in_app') {
        ref = 'in-app'; // tidak dikirim keluar, cukup ditandai
      } else {
        throw new Error(`Kanal tidak dikenal / penerima kosong (channel: ${n.channel}).`);
      }

      await supabase
        .from('notifications')
        .update({ status_kirim: 'Sent', provider_ref: ref, error_message: null })
        .eq('id', n.id);
      sent++;
    } catch (e) {
      await supabase
        .from('notifications')
        .update({ status_kirim: 'Failed', error_message: (e as Error).message?.slice(0, 500) })
        .eq('id', n.id);
      failed++;
    }
  }

  return json({ processed: queue.length, sent, failed });
});