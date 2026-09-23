-- =====================================================================
-- FILE : supabase/migrations/003_rls_policies.sql
-- =====================================================================

-- Aktifkan RLS pada SEMUA tabel (default: deny semua akses)
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;

-- =========================== PROFILES ===========================
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  -- Perubahan role/email tetap diblokir oleh trigger protect_profile_role.

-- Lookup nama (tanpa membuka isi tabel profiles) untuk kebutuhan tampilan
CREATE OR REPLACE FUNCTION public.get_profile_directory()
RETURNS TABLE (id UUID, nama_lengkap TEXT, role public.role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT p.id, p.nama_lengkap, p.role FROM public.profiles p ORDER BY p.nama_lengkap;
 $$;
GRANT EXECUTE ON FUNCTION public.get_profile_directory() TO authenticated;

-- =========================== APPLICATIONS =======================
-- Formulir pendaftaran PUBLIK (belum login): hanya boleh KIRIM
-- pengajuan berstatus 'Pending' — tidak bisa memalsukan status Approved.
DROP POLICY IF EXISTS "applications_insert_public" ON public.applications;
CREATE POLICY "applications_insert_public" ON public.applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status_pendaftaran = 'Pending'
    AND durasi_magang BETWEEN 1 AND 3
  );

DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;
CREATE POLICY "applications_admin_all" ON public.applications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================== GROUPS =============================
DROP POLICY IF EXISTS "groups_admin_all" ON public.groups;
CREATE POLICY "groups_admin_all" ON public.groups
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "groups_select_mentor_member" ON public.groups;
CREATE POLICY "groups_select_mentor_member" ON public.groups
  FOR SELECT TO authenticated
  USING (
    mentor_id = auth.uid()                 -- pembimbing kelompok ini
    OR public.is_group_member(id)          -- anggota kelompok ini
  );

-- =========================== INTERNS ============================
DROP POLICY IF EXISTS "interns_admin_all" ON public.interns;
CREATE POLICY "interns_admin_all" ON public.interns
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "interns_select_scoped" ON public.interns;
CREATE POLICY "interns_select_scoped" ON public.interns
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()                   -- data sendiri (sesuai user_id)
    OR public.is_my_mentee(id)             -- anak binaan pembimbing
    OR public.is_teammate(id)              -- se-grup (read-only, kebutuhan "melihat kelompok")
  );

-- =========================== PROJECTS ===========================
DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
CREATE POLICY "projects_admin_all" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "projects_select_scoped" ON public.projects;
CREATE POLICY "projects_select_scoped" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_group_mentor(group_id)
    OR public.is_group_member(group_id)
  );

DROP POLICY IF EXISTS "projects_write_mentor" ON public.projects;
CREATE POLICY "projects_write_mentor" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_group_mentor(group_id));

DROP POLICY IF EXISTS "projects_update_mentor" ON public.projects;
CREATE POLICY "projects_update_mentor" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_group_mentor(group_id))
  WITH CHECK (public.is_group_mentor(group_id));

-- =========================== KANBAN TASKS =======================
DROP POLICY IF EXISTS "kanban_admin_all" ON public.kanban_tasks;
CREATE POLICY "kanban_admin_all" ON public.kanban_tasks
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "kanban_select_scoped" ON public.kanban_tasks;
CREATE POLICY "kanban_select_scoped" ON public.kanban_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_own_intern(intern_id)        -- kartu milik sendiri
    OR public.is_my_mentee(intern_id)      -- Group Overview pembimbing
  );

DROP POLICY IF EXISTS "kanban_insert_mentor" ON public.kanban_tasks;
CREATE POLICY "kanban_insert_mentor" ON public.kanban_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_my_mentee(intern_id));   -- hanya pembimbing/admin yang menugaskan

DROP POLICY IF EXISTS "kanban_update_intern_mentor" ON public.kanban_tasks;
CREATE POLICY "kanban_update_intern_mentor" ON public.kanban_tasks
  FOR UPDATE TO authenticated
  USING (public.is_own_intern(intern_id) OR public.is_my_mentee(intern_id))
  WITH CHECK (public.is_own_intern(intern_id) OR public.is_my_mentee(intern_id));
  -- Intern: geser kartu, unggah file_bukti & catatan_pengumpulan.
  -- Mentor: Approve (->Done) / Revisi (->In Progress + catatan_revisi).

DROP POLICY IF EXISTS "kanban_delete_mentor" ON public.kanban_tasks;
CREATE POLICY "kanban_delete_mentor" ON public.kanban_tasks
  FOR DELETE TO authenticated
  USING (public.is_my_mentee(intern_id));

-- =========================== ATTENDANCE =========================
DROP POLICY IF EXISTS "attendance_admin_all" ON public.attendance;
CREATE POLICY "attendance_admin_all" ON public.attendance
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "attendance_select_scoped" ON public.attendance;
CREATE POLICY "attendance_select_scoped" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.is_own_intern(intern_id)
    OR public.is_my_mentee(intern_id)
  );

-- Check-in: hanya baris HARI INI berstatus Hadir (anti backdating)
DROP POLICY IF EXISTS "attendance_insert_self_today" ON public.attendance;
CREATE POLICY "attendance_insert_self_today" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_own_intern(intern_id)
    AND tanggal_presensi = CURRENT_DATE
    AND status_kehadiran = 'Hadir'
  );

-- Check-out: intern hanya boleh mengubah baris miliknya
DROP POLICY IF EXISTS "attendance_update_self" ON public.attendance;
CREATE POLICY "attendance_update_self" ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.is_own_intern(intern_id))
  WITH CHECK (public.is_own_intern(intern_id));

-- =========================== LEAVE REQUESTS =====================
DROP POLICY IF EXISTS "leaves_admin_all" ON public.leave_requests;
CREATE POLICY "leaves_admin_all" ON public.leave_requests
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "leaves_select_scoped" ON public.leave_requests;
CREATE POLICY "leaves_select_scoped" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    public.is_own_intern(intern_id)
    OR public.is_my_mentee(intern_id)
  );

-- Intern hanya bisa mengajukan (status wajib 'Pending')
DROP POLICY IF EXISTS "leaves_insert_self" ON public.leave_requests;
CREATE POLICY "leaves_insert_self" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_own_intern(intern_id)
    AND status_izin = 'Pending'
  );

-- Approve/Reject oleh pembimbing (memicu trigger presensi otomatis)
DROP POLICY IF EXISTS "leaves_update_mentor" ON public.leave_requests;
CREATE POLICY "leaves_update_mentor" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.is_my_mentee(intern_id))
  WITH CHECK (public.is_my_mentee(intern_id));

-- =========================== MENTORING SCHEDULES ================
DROP POLICY IF EXISTS "mentoring_admin_all" ON public.mentoring_schedules;
CREATE POLICY "mentoring_admin_all" ON public.mentoring_schedules
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mentoring_select_scoped" ON public.mentoring_schedules;
CREATE POLICY "mentoring_select_scoped" ON public.mentoring_schedules
  FOR SELECT TO authenticated
  USING (
    public.is_group_mentor(group_id)
    OR public.is_group_member(group_id)    -- link Zoom/Gmeet muncul di dashboard kelompok
  );

DROP POLICY IF EXISTS "mentoring_insert_mentor" ON public.mentoring_schedules;
CREATE POLICY "mentoring_insert_mentor" ON public.mentoring_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_group_mentor(group_id));

DROP POLICY IF EXISTS "mentoring_update_mentor" ON public.mentoring_schedules;
CREATE POLICY "mentoring_update_mentor" ON public.mentoring_schedules
  FOR UPDATE TO authenticated
  USING (public.is_group_mentor(group_id))
  WITH CHECK (public.is_group_mentor(group_id));

DROP POLICY IF EXISTS "mentoring_delete_mentor" ON public.mentoring_schedules;
CREATE POLICY "mentoring_delete_mentor" ON public.mentoring_schedules
  FOR DELETE TO authenticated
  USING (public.is_group_mentor(group_id));

-- =========================== RUBRIC SCORES ======================
DROP POLICY IF EXISTS "rubric_admin_all" ON public.rubric_scores;
CREATE POLICY "rubric_admin_all" ON public.rubric_scores
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "rubric_select_scoped" ON public.rubric_scores;
CREATE POLICY "rubric_select_scoped" ON public.rubric_scores
  FOR SELECT TO authenticated
  USING (
    public.is_own_intern(intern_id)
    OR public.is_my_mentee(intern_id)
  );

DROP POLICY IF EXISTS "rubric_insert_mentor" ON public.rubric_scores;
CREATE POLICY "rubric_insert_mentor" ON public.rubric_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_my_mentee(intern_id));

DROP POLICY IF EXISTS "rubric_update_mentor" ON public.rubric_scores;
CREATE POLICY "rubric_update_mentor" ON public.rubric_scores
  FOR UPDATE TO authenticated
  USING (public.is_my_mentee(intern_id))
  WITH CHECK (public.is_my_mentee(intern_id));

-- =========================== NOTIFICATIONS ======================
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  -- INSERT tidak dibuka untuk klien: hanya Edge Function (service_role)
  -- dan admin yang boleh membuat notifikasi.