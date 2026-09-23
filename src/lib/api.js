import { supabase } from './supabaseClient';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Memanggil edge function approve-application (action: 'approve' | 'reject').
 * Melempar Error berisi pesan dari function jika gagal (termasuk "Kuota penuh").
 */
export async function approveApplication({ applicationId, action, catatan = null }) {
  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi?.session?.access_token;
  if (!token) throw new Error('Sesi berakhir. Silakan login ulang.');

  const res = await fetch(`${BASE_URL}/functions/v1/approve-application`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      application_id: applicationId,
      action,
      ...(catatan ? { catatan } : {}),
    }),
  });

  let hasil = {};
  try { hasil = await res.json(); } catch { /* respons bukan JSON */ }
  if (!res.ok) throw new Error(hasil?.error || `Gagal memproses (HTTP ${res.status}).`);
  return hasil;
}

/** Membuat signed URL (1 jam) untuk file di bucket privat intern-files. */
export async function buatUrlFile(path, durasiDetik = 3600) {
  const { data, error } = await supabase.storage
    .from('intern-files')
    .createSignedUrl(path, durasiDetik);
  if (error) throw new Error('Gagal membuka file: ' + error.message);
  return data.signedUrl;
}

/**
 * Aktif / nonaktifkan akun peserta (lewat edge function kelola-akun).
 */
export async function kelolaAkun(userId, aksi) {
  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi?.session?.access_token;
  if (!token) throw new Error('Sesi berakhir. Login ulang.');

  const res = await fetch(`${BASE_URL}/functions/v1/kelola-akun`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, aksi }),
  });

  const hasil = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(hasil?.error || `Gagal (HTTP ${res.status}).`);
  return hasil;
}