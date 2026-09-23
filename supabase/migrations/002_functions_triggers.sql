-- =====================================================================
-- FILE : supabase/migrations/002_functions_triggers.sql
-- ISI  : Helper RLS, Trigger otomatisasi, ALGORITMA KUOTA (PRD §4),
--        Statistik presensi, dan Penugasan tugas kelompok.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. HELPER FUNGSI ROLE (SECURITY DEFINER -> bebas recursive-policy RLS)
--    Dipakai di dalam policy Bagian 3. Dievaluasi per-query, dijamin aman.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
 $$;

CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'mentor');
 $$;

-- TRUE jika baris intern (p_intern_id) milik pemanggil (intern itu sendiri)
CREATE OR REPLACE FUNCTION public.is_own_intern(p_intern_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (SELECT 1 FROM public.interns WHERE id = p_intern_id AND user_id = auth.uid());
 $$;

-- TRUE jika baris intern tersebut adalah anak binaan pembimbing pemanggil
CREATE OR REPLACE FUNCTION public.is_my_mentee(p_intern_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns i
    JOIN public.groups g ON g.id = i.group_id
    WHERE i.id = p_intern_id AND g.mentor_id = auth.uid()
  );
 $$;

-- TRUE jika intern pemanggil satu kelompok dengan p_intern_id (hanya nama, read-only)
CREATE OR REPLACE FUNCTION public.is_teammate(p_intern_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns me
    JOIN public.interns other ON other.group_id = me.group_id
    WHERE me.user_id = auth.uid()
      AND me.group_id IS NOT NULL
      AND other.id = p_intern_id
  );
 $$;

CREATE OR REPLACE FUNCTION public.is_group_mentor(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND mentor_id = auth.uid());
 $$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns
    WHERE user_id = auth.uid() AND group_id = p_group_id
  );
 $$;

-- ---------------------------------------------------------------------
-- B. TRIGGER: updated_at otomatis
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','applications','groups','interns','projects','kanban_tasks',
    'attendance','leave_requests','mentoring_schedules','rubric_scores'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- C. TRIGGER: buat profile otomatis setiap user baru terdaftar
--    KEAMANAN: role diambil dari raw_APP_meta_data (HANYA bisa diisi oleh
--    Admin API/service key, TIDAK bisa dimanipulasi signup publik).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, email, role, nomor_whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email),
    NEW.email,
    CASE NEW.raw_app_meta_data->>'role'
      WHEN 'admin'  THEN 'admin'::public.role
      WHEN 'mentor' THEN 'mentor'::public.role
      ELSE 'intern'::public.role
    END,
    NEW.raw_user_meta_data->>'nomor_whatsapp'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- D. TRIGGER: cegah eskalasi hak akses (anti privilege-escalation)
--    Hanya admin (atau service role, auth.uid() NULL) boleh mengubah
--    kolom role/email pada profiles. Intern tidak bisa "menjadikan
--    dirinya admin" lewat update profile sendiri.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF (NEW.role <> OLD.role OR NEW.email <> OLD.email)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Kolom role/email profiles hanya boleh diubah oleh admin.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile ON public.profiles;
CREATE TRIGGER trg_protect_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ---------------------------------------------------------------------
-- E. TRIGGER: izin disetujui -> otomatis tulis presensi Izin/Sakit
--    (PRD 3.4: izin approved TIDAK mengurangi nilai kedisiplinan).
--    Baris 'Hadir' yang sudah ada tidak pernah ditimpa.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_approved_leave()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.status_izin = 'Approved' AND OLD.status_izin IS DISTINCT FROM 'Approved' THEN
    INSERT INTO public.attendance (intern_id, tanggal_presensi, status_kehadiran)
    SELECT NEW.intern_id, d::date, NEW.jenis_izin::text::public.status_kehadiran
    FROM generate_series(NEW.tanggal_mulai, NEW.tanggal_selesai, INTERVAL '1 day') AS d
    WHERE EXTRACT(ISODOW FROM d) < 6  -- hanya hari kerja Senin-Jumat
    ON CONFLICT (intern_id, tanggal_presensi) DO UPDATE
      SET status_kehadiran = EXCLUDED.status_kehadiran,
          updated_at = now()
      WHERE public.attendance.status_kehadiran = 'Alpha';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_approved_leave ON public.leave_requests;
CREATE TRIGGER trg_apply_approved_leave
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_approved_leave();

-- ---------------------------------------------------------------------
-- F. ⭐ ALGORITMA CEK KUOTA BERJALAN (PRD §4) — versi PREDIKTIF
--    Input: bulan_mulai (M) & durasi (D).
--    Bulan aktif = [M, M+1, ... M+(D-1)] -> cek tiap bulan < 20.
--    Dipanggil: (1) form publik sebelum submit, (2) Edge Function approve.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_quota(
  p_bulan_mulai DATE,
  p_durasi      SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE
  v_kuota    CONSTANT INT := 20;
  v_bulan    DATE;
  v_jumlah   BIGINT;
  v_detail   JSONB := '[]'::jsonb;
  v_tersedia BOOLEAN := TRUE;
BEGIN
  IF p_bulan_mulai IS NULL THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'bulan_mulai wajib diisi.');
  END IF;
  IF p_durasi NOT BETWEEN 1 AND 3 THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'Durasi magang harus 1, 2, atau 3 bulan.');
  END IF;

  -- Loop setiap bulan aktif: [M, M+1, ..., M+(D-1)]
  FOR i IN 0 .. (p_durasi::int - 1) LOOP
    v_bulan := (date_trunc('month', p_bulan_mulai) + make_interval(months => i))::date;

    -- Jumlah peserta ter-approve yang MENEMPATI slot pada bulan v_bulan
    -- (masa magangnya mencakup bulan tsb, termasuk lintas bulan/overlapping)
    SELECT COUNT(*) INTO v_jumlah
    FROM public.interns x
    WHERE x.status_magang <> 'Dropped'
      AND date_trunc('month', x.bulan_mulai) <= v_bulan
      AND (date_trunc('month', x.bulan_mulai) + make_interval(months => x.durasi_magang::int)) > v_bulan;

    v_detail := v_detail || jsonb_build_object(
      'bulan',  to_char(v_bulan, 'YYYY-MM'),
      'terisi', v_jumlah,
      'sisa',   GREATEST(v_kuota - v_jumlah, 0),
      'penuh',  v_jumlah >= v_kuota
    );

    IF v_jumlah >= v_kuota THEN
      v_tersedia := FALSE;   -- RETURN FALSE (Kuota penuh di bulan tsb)
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'tersedia',     v_tersedia,   -- TRUE hanya jika SEMUA bulan < 20
    'kuota_maks',   v_kuota,
    'detail_bulan', v_detail
  );
END $$;

-- ---------------------------------------------------------------------
-- F2. ⭐ TRIGGER PENEGAK KUOTA (versi MUTLAK — PRD §4)
--     Menjalankan ulang pengecekan pada saat INSERT/UPDATE interns.
--     Melindungi dari race condition dua admin approve bersamaan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_quota_on_intern_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE
  v_kuota  CONSTANT INT := 20;
  v_bulan  DATE;
  v_jumlah BIGINT;
BEGIN
  FOR i IN 0 .. (NEW.durasi_magang::int - 1) LOOP
    v_bulan := (date_trunc('month', NEW.bulan_mulai) + make_interval(months => i))::date;
    SELECT COUNT(*) INTO v_jumlah
    FROM public.interns x
    WHERE x.id <> NEW.id
      AND x.status_magang <> 'Dropped'
      AND date_trunc('month', x.bulan_mulai) <= v_bulan
      AND (date_trunc('month', x.bulan_mulai) + make_interval(months => x.durasi_magang::int)) > v_bulan;
    IF v_jumlah >= v_kuota THEN
      RAISE EXCEPTION
        'Kuota bulan % penuh (maksimal % peserta aktif). Approve diblokir.',
        to_char(v_bulan, 'YYYY-MM'), v_kuota;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_quota ON public.interns;
CREATE TRIGGER trg_enforce_quota
  BEFORE INSERT OR UPDATE OF bulan_mulai, durasi_magang ON public.interns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quota_on_intern_change();

-- ---------------------------------------------------------------------
-- G. Fungsi VISUALISASI KUOTA (Dashboard Analytics Admin — PRD 3.5)
--    Mengembalikan terisi/tersisa per bulan selama N bulan ke depan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quota_usage(
  p_mulai        DATE DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_jumlah_bulan INT  DEFAULT 12
)
RETURNS TABLE (
  bulan         DATE,
  bulan_label   TEXT,
  kuota_maks    INT,
  kuota_terisi  BIGINT,
  kuota_tersisa BIGINT,
  persen_terisi NUMERIC(5,2)
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$   WITH bulan_seq AS (
    SELECT (date_trunc('month', p_mulai) + make_interval(months => gs))::date AS tgl
    FROM generate_series(0, GREATEST(p_jumlah_bulan - 1, 0)) AS gs
  )
  SELECT bs.tgl,
         to_char(bs.tgl, 'YYYY-MM'),
         20,
         u.terisi,
         20 - u.terisi,
         ROUND(u.terisi * 100.0 / 20, 2)
  FROM bulan_seq bs
  CROSS JOIN LATERAL (
    SELECT COUNT(*) AS terisi
    FROM public.interns i
    WHERE i.status_magang <> 'Dropped'
      AND date_trunc('month', i.bulan_mulai) <= bs.tgl
      AND (date_trunc('month', i.bulan_mulai) + make_interval(months => i.durasi_magang::int)) > bs.tgl
  ) u
  ORDER BY bs.tgl;
 $$;

-- ---------------------------------------------------------------------
-- H. Statistik kehadiran real-time (target minimal 85% — PRD 3.4)
--    Izin/Sakit approved dihitung HADIR di nilai kedisiplinan.
--    Alpha = hari kerja berlalu tanpa presensi.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_attendance_stats(p_intern_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE
  v_intern_id  UUID  := p_intern_id;
  v_mulai      DATE;
  v_akhir      DATE;
  v_target     CONSTANT NUMERIC := 85;
  v_total_hari BIGINT := 0;
  v_hadir      BIGINT := 0;
  v_izin       BIGINT := 0;
  v_sakit      BIGINT := 0;
  v_valid      BIGINT := 0;
  v_alpha      BIGINT := 0;
  v_persen     NUMERIC;
  v_toleransi  BIGINT := 0;
  v_status     TEXT;
BEGIN
  IF v_intern_id IS NULL THEN
    SELECT id INTO v_intern_id FROM public.interns WHERE user_id = auth.uid();
  END IF;
  IF v_intern_id IS NULL THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'Data intern tidak ditemukan.');
  END IF;

  -- Guard akses: hanya diri sendiri, pembimbingnya, atau admin
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NOT public.is_own_intern(v_intern_id)
     AND NOT public.is_my_mentee(v_intern_id) THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'Tidak diizinkan melihat data ini.');
  END IF;

  SELECT i.bulan_mulai, i.tanggal_selesai INTO v_mulai, v_akhir
  FROM public.interns i WHERE i.id = v_intern_id;

  -- Periode berjalan: bulan masuk s.d. hari ini (atau hari terakhir masa magang)
  v_akhir := LEAST(CURRENT_DATE, (v_akhir - INTERVAL '1 day'))::date;

  -- Total hari kerja (Senin-Jumat) yang sudah berlalu
  SELECT COUNT(*) INTO v_total_hari
  FROM generate_series(v_mulai, v_akhir, INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) < 6;

  -- Rekap status (hanya hari kerja, agar tidak melebihi 100%)
  SELECT COUNT(*) FILTER (WHERE a.status_kehadiran = 'Hadir'),
         COUNT(*) FILTER (WHERE a.status_kehadiran = 'Izin'),
         COUNT(*) FILTER (WHERE a.status_kehadiran = 'Sakit')
  INTO v_hadir, v_izin, v_sakit
  FROM public.attendance a
  WHERE a.intern_id = v_intern_id
    AND a.tanggal_presensi BETWEEN v_mulai AND v_akhir
    AND EXTRACT(ISODOW FROM a.tanggal_presensi) < 6;

  v_valid     := v_hadir + v_izin + v_sakit;          -- Izin/Sakit tidak mengurangi nilai
  v_alpha     := GREATEST(v_total_hari - v_valid, 0);
  v_persen    := CASE WHEN v_total_hari = 0 THEN NULL
                      ELSE ROUND(v_valid * 100.0 / v_total_hari, 2) END;
  v_toleransi := FLOOR(v_total_hari * (100 - v_target) / 100.0); -- otomatis menyesuaikan durasi 1/2/3 bulan
  v_status    := CASE WHEN v_persen IS NULL   THEN 'Belum Mulai'
                      WHEN v_persen >= v_target THEN 'Memenuhi Syarat'
                      ELSE 'Di Bawah Target' END;

  RETURN jsonb_build_object(
    'intern_id',              v_intern_id,
    'periode_mulai',          v_mulai,
    'periode_berjalan_sampai', v_akhir,
    'total_hari_kerja',       v_total_hari,
    'hadir',                  v_hadir,
    'izin',                   v_izin,
    'sakit',                  v_sakit,
    'alpha',                  v_alpha,
    'persen_kehadiran',       v_persen,
    'target_persen',          v_target,
    'toleransi_hari',         v_toleransi,
    'status',                 v_status
  );
END $$;

-- ---------------------------------------------------------------------
-- I. Penugasan tugas ke KELOMPOK (Task Workflow PRD)
--    Membuat 1 kartu Kanban per anggota aktif dengan assignment_id sama.
--    Dipanggil pembimbing/admin via RPC (frontend Bagian 3).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_task_to_group(
  p_project_id UUID,
  p_judul      TEXT,
  p_deskripsi  TEXT DEFAULT NULL,
  p_deadline   DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE
  v_group_id   UUID;
  v_assignment UUID := gen_random_uuid();
  v_jumlah     INT;
BEGIN
  SELECT group_id INTO v_group_id FROM public.projects WHERE id = p_project_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Project dengan id % tidak ditemukan.', p_project_id;
  END IF;

  -- Hanya admin atau pembimbing kelompok terkait yang boleh menugaskan
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NOT public.is_group_mentor(v_group_id) THEN
    RAISE EXCEPTION 'Anda bukan pembimbing kelompok ini.';
  END IF;

  INSERT INTO public.kanban_tasks
    (project_id, intern_id, assignment_id, judul_tugas, deskripsi_tugas, deadline_tugas, assigned_by)
  SELECT p_project_id, i.id, v_assignment, p_judul, p_deskripsi, p_deadline, auth.uid()
  FROM public.interns i
  WHERE i.group_id = v_group_id AND i.status_magang = 'Active';

  GET DIAGNOSTICS v_jumlah = ROW_COUNT;

  RETURN jsonb_build_object(
    'sukses',        TRUE,
    'jumlah_kartu',  v_jumlah,       -- jumlah anggota yang menerima kartu
    'assignment_id', v_assignment
  );
END $$;

-- ---------------------------------------------------------------------
-- J. Cron harian: tandai 'Alpha' untuk hari kerja kemarin tanpa presensi
--    (baris Alpha inilah yang akan di-update menjadi 'Izin'/'Sakit'
--    oleh trigger E saat izin disetujui — desain saling melengkapi).
--    17:30 UTC = 00:30 WIB.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_alpha_yesterday()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE v_count INT;
BEGIN
  INSERT INTO public.attendance (intern_id, tanggal_presensi, status_kehadiran)
  SELECT i.id, CURRENT_DATE - 1, 'Alpha'
  FROM public.interns i
  WHERE i.status_magang = 'Active'
    AND i.bulan_mulai <= CURRENT_DATE - 1
    AND (CURRENT_DATE - 1) < i.tanggal_selesai
    AND EXTRACT(ISODOW FROM (CURRENT_DATE - 1)) < 6
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a.intern_id = i.id AND a.tanggal_presensi = CURRENT_DATE - 1
    )
  ON CONFLICT (intern_id, tanggal_presensi) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-alpha-daily') THEN
    PERFORM cron.schedule('mark-alpha-daily', '30 17 * * *',
                          'SELECT public.mark_alpha_yesterday();');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Penjadwalan pg_cron dilewati: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- K. GRANT eksekusi (default sudah PUBLIC; dibuat eksplisit untuk dokumentasi)
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.check_quota(DATE, SMALLINT)            TO anon, authenticated; -- form publik
GRANT EXECUTE ON FUNCTION public.get_quota_usage(DATE, INT)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_stats(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_task_to_group(UUID, TEXT, TEXT, DATE) TO authenticated;