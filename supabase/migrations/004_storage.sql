-- =====================================================================
-- FILE : supabase/migrations/004_storage.sql
-- ISI  : Bucket 'intern-files' (PRIVATE) + Storage Policies.
--        Aturan PRD §7: file besar TIDAK disimpan sebagai blob di tabel;
--        tabel hanya menyimpan public/signed URL-nya.
--
-- Struktur folder yang disepakati (dipakai frontend Bagian 3 & 4):
--   intern-files/applications/{id}/cv.pdf                <- upload anon (form pendaftaran)
--   intern-files/{user_id}/tasks/{task_id}/bukti.zip     <- upload intern (bukti tugas)
--   intern-files/{user_id}/leaves/{leave_id}/surat.jpg   <- upload intern (bukti izin)
-- =====================================================================

-- 1. BUCKET: private + batas ukuran 5 MB + whitelist tipe file
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intern-files',
  'intern-files',
  false,
  5242880, -- 5 MB per file (menjaga Free Tier)
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public            = false,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. POLICIES di storage.objects
-- 2a. ANON: hanya boleh mengunggah ke folder 'applications/...' (form publik)
DROP POLICY IF EXISTS "intern_files_upload_applications" ON storage.objects;
CREATE POLICY "intern_files_upload_applications" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'intern-files'
    AND (storage.foldername(name))[1] = 'applications'
  );

-- 2b. INTERN (authenticated): unggah/ubah hanya ke folder miliknya sendiri
DROP POLICY IF EXISTS "intern_files_upload_own" ON storage.objects;
CREATE POLICY "intern_files_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'intern-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "intern_files_update_own" ON storage.objects;
CREATE POLICY "intern_files_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'intern-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'intern-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2c. BACA: admin/mentor/intern membaca file via SIGNED URL
--     (bucket private: URL bertoken & berkala waktu, bukan URL permanen)
DROP POLICY IF EXISTS "intern_files_read_authenticated" ON storage.objects;
CREATE POLICY "intern_files_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'intern-files');

-- 2d. HAPUS: hanya admin
DROP POLICY IF EXISTS "intern_files_delete_admin" ON storage.objects;
CREATE POLICY "intern_files_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'intern-files' AND public.is_admin());

-- Catatan hardening (opsional, di luar scope MVP):
-- kebijakan 2c membolehkan authenticated membaca objek apapun jika path diketahui.
-- Untuk lebih ketat, arahkan semua upload/download melalui Edge Function
-- dengan service_role (akan dibahas di Bagian 2 & 4).