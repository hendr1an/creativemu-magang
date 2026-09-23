-- =====================================================================
-- FILE   : supabase/migrations/001_schema.sql
-- PROYEK : Sistem Manajemen Magang - Creativemu Academy (Sedayu)
-- ISI    : Ekstensi, Tipe ENUM, Tabel, Relasi (FK), dan Index
-- CATATAN: Jalankan urut 001 -> 004. Aman dijalankan ulang (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EKSTENSI
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;  -- job harian penandaan Alpha
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron tidak tersedia; penjadwalan otomatis akan dilewati.';
END $$;

-- ---------------------------------------------------------------------
-- 1. TIPE ENUM
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.role AS ENUM ('admin', 'mentor', 'intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_pendaftaran AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_kanban AS ENUM ('To-Do', 'In Progress', 'In Review', 'Done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_kehadiran AS ENUM ('Hadir', 'Izin', 'Sakit', 'Alpha');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.jenis_izin AS ENUM ('Izin', 'Sakit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_izin AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_magang AS ENUM ('Active', 'Completed', 'Dropped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_sesi AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.channel_notifikasi AS ENUM ('in_app', 'email', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_pengiriman AS ENUM ('Pending', 'Sent', 'Failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2. TABEL
-- ---------------------------------------------------------------------

-- 2.1 PROFILES : 1:1 dengan auth.users (dibuat otomatis oleh trigger di 002)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap    TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  role            public.role NOT NULL DEFAULT 'intern',
  nomor_whatsapp  TEXT,                    -- dipakai oleh WhatsApp Gateway (PRD 3.6)
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 APPLICATIONS : pengajuan magang dari form publik (belum punya akun)
CREATE TABLE IF NOT EXISTS public.applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lengkap       TEXT NOT NULL,
  email              TEXT NOT NULL,
  nomor_whatsapp     TEXT NOT NULL,
  cv_url             TEXT,                 -- URL file di Storage (BUKAN blob!)
  portofolio_url     TEXT,                 -- URL portofolio (link/Storage)
  bulan_mulai        DATE NOT NULL,        -- selalu tanggal 1, format 'YYYY-MM-01'
  durasi_magang      SMALLINT NOT NULL CHECK (durasi_magang BETWEEN 1 AND 3),
  status_pendaftaran public.status_pendaftaran NOT NULL DEFAULT 'Pending',
  catatan_admin      TEXT,                 -- alasan Reject, dsb.
  reviewed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 1 email hanya boleh punya 1 pengajuan AKTIF (Pending/Approved).
-- Pendaftar yang ditolak boleh mendaftar ulang.
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_email_aktif
  ON public.applications (email) WHERE status_pendaftaran <> 'Rejected';

-- 2.3 GROUPS : kelompok magang + pembimbingnya
CREATE TABLE IF NOT EXISTS public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kelompok TEXT NOT NULL UNIQUE,
  batch_label   TEXT,                      -- contoh: 'Batch 2025-06'
  mentor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- = profiles.id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 INTERNS : peserta magang yang SUDAH di-approve (akun sudah dibuat)
-- Contoh periode: mulai 2025-06-01 durasi 2 bulan -> aktif Juni & Juli,
-- tanggal_selesai = 2025-08-01 (batas EKSKLUSIF, dipakai algoritma kuota).
CREATE TABLE IF NOT EXISTS public.interns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- = profiles.id
  application_id  UUID UNIQUE REFERENCES public.applications(id) ON DELETE SET NULL,
  nama_lengkap    TEXT NOT NULL,
  email           TEXT NOT NULL,
  nomor_whatsapp  TEXT,
  group_id        UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  bulan_mulai     DATE NOT NULL,
  durasi_magang   SMALLINT NOT NULL CHECK (durasi_magang BETWEEN 1 AND 3),
  tanggal_selesai DATE GENERATED ALWAYS AS
                  ((bulan_mulai + make_interval(months => durasi_magang::int))::date) STORED,
  status_magang   public.status_magang NOT NULL DEFAULT 'Active',
  nilai_final     NUMERIC(5,2),            -- diisi otomatis saat kelulusan (Bagian 2)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 PROJECTS : Real Project yang ditugaskan ke kelompok
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  mentor_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  judul_projek    TEXT NOT NULL,
  deskripsi       TEXT,
  deadline_projek DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 KANBAN_TASKS : kartu tugas per anak magang (Task Workflow PRD)
CREATE TABLE IF NOT EXISTS public.kanban_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  intern_id           UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  assignment_id       UUID NOT NULL DEFAULT gen_random_uuid(),
      -- 1 penugasan kelompok menghasilkan banyak kartu kembar (per anggota);
      -- assignment_id yang sama menandai kartu-kartu dari instruksi yang sama.
  judul_tugas         TEXT NOT NULL,
  deskripsi_tugas     TEXT,
  status_tugas        public.status_kanban NOT NULL DEFAULT 'To-Do',
  file_bukti          TEXT,   -- URL file progres di Supabase Storage (BUKAN blob!)
  catatan_pengumpulan TEXT,   -- keterangan anak magang saat submit ke 'In Review'
  catatan_revisi      TEXT,   -- feedback pembimbing saat Revisi (kartu kembali ke 'In Progress')
  deadline_tugas      DATE,
  posisi              SMALLINT NOT NULL DEFAULT 0,  -- urutan kartu dalam kolom
  assigned_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at        TIMESTAMPTZ,   -- waktu pindah ke 'In Review'
  reviewed_at         TIMESTAMPTZ,   -- waktu pembimbing Approve/Revisi
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 ATTENDANCE : presensi harian (1 baris per intern per hari)
CREATE TABLE IF NOT EXISTS public.attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id        UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  tanggal_presensi DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in         TIMESTAMPTZ,
  check_out        TIMESTAMPTZ,
  status_kehadiran public.status_kehadiran NOT NULL DEFAULT 'Hadir',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intern_id, tanggal_presensi)
);

-- 2.8 LEAVE_REQUESTS : pengajuan Izin/Sakit (PRD 3.4)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id        UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  jenis_izin       public.jenis_izin NOT NULL,
  tanggal_mulai    DATE NOT NULL,
  tanggal_selesai  DATE NOT NULL,
  alasan           TEXT NOT NULL,
  bukti_url        TEXT,   -- URL foto/surat di Supabase Storage (BUKAN blob!)
  status_izin      public.status_izin NOT NULL DEFAULT 'Pending',
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  catatan_reviewer TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leave_range_valid CHECK (tanggal_selesai >= tanggal_mulai)
);

-- 2.9 MENTORING_SCHEDULES : jadwal sync/mentoring mingguan (PRD 3.3)
CREATE TABLE IF NOT EXISTS public.mentoring_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  mentor_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judul_sesi    TEXT NOT NULL,
  tanggal_waktu TIMESTAMPTZ NOT NULL,
  platform      TEXT,              -- 'Zoom' / 'Google Meet'
  link_meeting  TEXT,              -- tampil otomatis di dashboard kelompok
  catatan       TEXT,
  status_sesi   public.status_sesi NOT NULL DEFAULT 'Scheduled',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 RUBRIC_SCORES : penilaian soft skill & hard skill (PRD 3.5)
CREATE TABLE IF NOT EXISTS public.rubric_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id        UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periode          TEXT NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- 'YYYY-MM'
  nilai_soft_skill NUMERIC(5,2) NOT NULL CHECK (nilai_soft_skill BETWEEN 0 AND 100),
  nilai_hard_skill NUMERIC(5,2) NOT NULL CHECK (nilai_hard_skill BETWEEN 0 AND 100),
  catatan_mentor   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intern_id, periode)
);

-- 2.11 NOTIFICATIONS : log notifikasi email / WhatsApp / in-app (PRD 3.6)
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,          -- penerima ber-akun
  application_id  UUID REFERENCES public.applications(id) ON DELETE CASCADE, -- pendaftar (belum ber-akun)
  channel         public.channel_notifikasi NOT NULL DEFAULT 'in_app',
  recipient_email TEXT,
  recipient_phone TEXT,
  judul           TEXT,
  pesan           TEXT NOT NULL,
  status_kirim    public.status_pengiriman NOT NULL DEFAULT 'Pending',
  error_message   TEXT,
  provider_ref    TEXT,          -- ID pesan dari gateway (audit)
  read_at         TIMESTAMPTZ,   -- untuk notifikasi in-app
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. INDEX (kolom yang sering di-query — PRD: bulan_mulai, status, presensi)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_status      ON public.applications (status_pendaftaran);
CREATE INDEX IF NOT EXISTS idx_applications_bulan_mulai ON public.applications (bulan_mulai);
CREATE INDEX IF NOT EXISTS idx_applications_created     ON public.applications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interns_bulan_mulai ON public.interns (bulan_mulai); -- algoritma kuota
CREATE INDEX IF NOT EXISTS idx_interns_status     ON public.interns (status_magang);
CREATE INDEX IF NOT EXISTS idx_interns_group      ON public.interns (group_id);

CREATE INDEX IF NOT EXISTS idx_groups_mentor  ON public.groups (mentor_id);
CREATE INDEX IF NOT EXISTS idx_projects_group ON public.projects (group_id);

CREATE INDEX IF NOT EXISTS idx_tasks_intern_status ON public.kanban_tasks (intern_id, status_tugas);
CREATE INDEX IF NOT EXISTS idx_tasks_project       ON public.kanban_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_in_review     ON public.kanban_tasks (intern_id)
  WHERE status_tugas = 'In Review';  -- antrean review pembimbing

-- UNIQUE(intern_id, tanggal_presensi) sudah otomatis membuat composite index
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance (tanggal_presensi);

CREATE INDEX IF NOT EXISTS idx_leaves_intern ON public.leave_requests (intern_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leave_requests (status_izin);
CREATE INDEX IF NOT EXISTS idx_leaves_range  ON public.leave_requests (tanggal_mulai, tanggal_selesai);

CREATE INDEX IF NOT EXISTS idx_mentoring_group_time ON public.mentoring_schedules (group_id, tanggal_waktu);
CREATE INDEX IF NOT EXISTS idx_rubric_intern       ON public.rubric_scores (intern_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_created  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_status        ON public.notifications (status_kirim);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles (role);