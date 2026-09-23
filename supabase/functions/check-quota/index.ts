// =====================================================================
// FUNGSI   : check-quota
// AKSES    : PUBLIK (calon magang belum login) → verify_jwt = OFF
// METHOD   : GET  ?bulan_mulai=YYYY-MM-DD&durasi=N
//            POST { "bulan_mulai": "YYYY-MM-DD", "durasi": N }
// TUGAS    : Validasi input + wrapper RPC check_quota (PRD §4).
//            Dipanggil formulir pendaftaran SEBELUM submit.
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method tidak diizinkan.' }, 405);
  }

  try {
    let bulanMulai = '';
    let durasi = NaN;

    if (req.method === 'GET') {
      const params = new URL(req.url).searchParams;
      bulanMulai = params.get('bulan_mulai') ?? '';
      durasi = parseInt(params.get('durasi') ?? '', 10);
    } else {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      bulanMulai = String(body.bulan_mulai ?? '');
      durasi = parseInt(String(body.durasi ?? ''), 10);
    }

    // ---------- Validasi input ----------
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bulanMulai) || isNaN(Date.parse(bulanMulai))) {
      return json({ error: 'bulan_mulai tidak valid. Gunakan format YYYY-MM-DD.' }, 400);
    }
    if (isNaN(durasi) || durasi < 1 || durasi > 3) {
      return json({ error: 'durasi harus 1, 2, atau 3 (bulan).' }, 400);
    }
    const bulanNormal = `${bulanMulai.slice(0, 7)}-01`; // normalkan ke tanggal 1

    // Tolak bulan yang sudah lewat
    const now = new Date();
    const bulanSekarang =
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
    if (bulanNormal < bulanSekarang) {
      return json({ error: 'Bulan mulai tidak boleh di masa lalu.' }, 400);
    }

    // ---------- Panggil algoritma kuota di DB (single source of truth) ----------
    const { data, error } = await supabase.rpc('check_quota', {
      p_bulan_mulai: bulanNormal,
      p_durasi: durasi,
    });
    if (error) return json({ error: error.message }, 500);

    return json(data);
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Kesalahan internal.' }, 500);
  }
});