


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."channel_notifikasi" AS ENUM (
    'in_app',
    'email',
    'whatsapp'
);


ALTER TYPE "public"."channel_notifikasi" OWNER TO "postgres";


CREATE TYPE "public"."divisi" AS ENUM (
    'Admin',
    'Sosmed',
    'Marketplace',
    'Web Developer'
);


ALTER TYPE "public"."divisi" OWNER TO "postgres";


CREATE TYPE "public"."jenis_izin" AS ENUM (
    'Izin',
    'Sakit',
    'WFH',
    'Terlambat'
);


ALTER TYPE "public"."jenis_izin" OWNER TO "postgres";


CREATE TYPE "public"."nilai_huruf" AS ENUM (
    'A',
    'B',
    'C',
    'D',
    'E'
);


ALTER TYPE "public"."nilai_huruf" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'admin',
    'mentor',
    'intern'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE TYPE "public"."status_izin" AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);


ALTER TYPE "public"."status_izin" OWNER TO "postgres";


CREATE TYPE "public"."status_kanban" AS ENUM (
    'To-Do',
    'In Progress',
    'In Review',
    'Done'
);


ALTER TYPE "public"."status_kanban" OWNER TO "postgres";


CREATE TYPE "public"."status_kehadiran" AS ENUM (
    'Hadir',
    'Izin',
    'Sakit',
    'Alpha'
);


ALTER TYPE "public"."status_kehadiran" OWNER TO "postgres";


CREATE TYPE "public"."status_magang" AS ENUM (
    'Active',
    'Completed',
    'Dropped'
);


ALTER TYPE "public"."status_magang" OWNER TO "postgres";


CREATE TYPE "public"."status_pendaftaran" AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);


ALTER TYPE "public"."status_pendaftaran" OWNER TO "postgres";


CREATE TYPE "public"."status_pengiriman" AS ENUM (
    'Pending',
    'Sent',
    'Failed'
);


ALTER TYPE "public"."status_pengiriman" OWNER TO "postgres";


CREATE TYPE "public"."status_sesi" AS ENUM (
    'Scheduled',
    'Completed',
    'Cancelled'
);


ALTER TYPE "public"."status_sesi" OWNER TO "postgres";


CREATE TYPE "public"."status_subtugas" AS ENUM (
    'Belum',
    'Selesai',
    'Menunggu Review',
    'Revisi'
);


ALTER TYPE "public"."status_subtugas" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_approved_leave"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF NEW.status_izin = 'Approved' AND OLD.status_izin IS DISTINCT FROM 'Approved' THEN

    -- Hanya untuk Izin & Sakit (WFH & Terlambat: manual check-in)
    IF NEW.jenis_izin IN ('Izin', 'Sakit') THEN
      INSERT INTO public.attendance (intern_id, tanggal_presensi, status_kehadiran)
      SELECT NEW.intern_id, d::date, NEW.jenis_izin::text::public.status_kehadiran
      FROM generate_series(NEW.tanggal_mulai, NEW.tanggal_selesai, INTERVAL '1 day') AS d
      WHERE EXTRACT(ISODOW FROM d) < 6
      ON CONFLICT (intern_id, tanggal_presensi) DO UPDATE
        SET status_kehadiran = EXCLUDED.status_kehadiran,
            updated_at = now()
        WHERE public.attendance.status_kehadiran = 'Alpha';
    END IF;
    -- WFH & Terlambat: tidak insert apapun — biarkan peserta presensi manual
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."apply_approved_leave"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_task_to_group"("p_project_id" "uuid", "p_judul" "text", "p_deskripsi" "text" DEFAULT NULL::"text", "p_deadline" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
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


ALTER FUNCTION "public"."assign_task_to_group"("p_project_id" "uuid", "p_judul" "text", "p_deskripsi" "text", "p_deadline" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buat_notifikasi"("p_user_id" "uuid", "p_judul" "text", "p_pesan" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  VALUES (p_user_id, 'in_app', p_judul, p_pesan, 'Sent');
END $$;


ALTER FUNCTION "public"."buat_notifikasi"("p_user_id" "uuid", "p_judul" "text", "p_pesan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_quota"("p_tanggal_mulai" "date", "p_durasi" integer, "p_satuan" "text" DEFAULT 'bulan'::"text", "p_selesai_custom" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ declare
  v_kuota constant int := 20;
  v_selesai date; v_awal date; v_akhir date;
  v_jumlah bigint; v_detail jsonb := '[]'::jsonb; v_tersedia boolean := true;
begin
  if p_tanggal_mulai is null then
    return jsonb_build_object('error', true, 'message', 'tanggal_mulai wajib diisi.');
  end if;
  if p_satuan not in ('minggu','bulan') then
    return jsonb_build_object('error', true, 'message', 'satuan harus minggu atau bulan.');
  end if;
  if p_durasi < 1 or p_durasi > public.max_durasi(p_satuan) then
    return jsonb_build_object('error', true, 'message',
      'Durasi maksimal ' || public.max_durasi(p_satuan) || ' ' || p_satuan || '.');
  end if;
  v_selesai := coalesce(p_selesai_custom,
    case when p_satuan = 'minggu' then (p_tanggal_mulai + (p_durasi * 7))
         else (p_tanggal_mulai + make_interval(months => p_durasi)) end);
  if v_selesai <= p_tanggal_mulai then
    return jsonb_build_object('error', true, 'message', 'Tanggal selesai harus setelah tanggal mulai.');
  end if;
  v_awal := date_trunc('month', p_tanggal_mulai)::date;
  v_akhir := date_trunc('month', v_selesai - 1)::date;
  while v_awal <= v_akhir loop
    select count(*) into v_jumlah from public.interns x
    where x.status_magang <> 'Dropped'
      and date_trunc('month', x.tanggal_mulai) <= v_awal
      and date_trunc('month', x.tanggal_selesai) > v_awal;
    v_detail := v_detail || jsonb_build_object(
      'bulan', to_char(v_awal, 'YYYY-MM'), 'terisi', v_jumlah,
      'sisa', greatest(v_kuota - v_jumlah, 0), 'penuh', v_jumlah >= v_kuota);
    if v_jumlah >= v_kuota then v_tersedia := false; end if;
    v_awal := (v_awal + interval '1 month')::date;
  end loop;
  return jsonb_build_object('tersedia', v_tersedia, 'kuota_maks', v_kuota,
    'tanggal_selesai', v_selesai, 'detail_bulan', v_detail);
end $$;


ALTER FUNCTION "public"."check_quota"("p_tanggal_mulai" "date", "p_durasi" integer, "p_satuan" "text", "p_selesai_custom" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_quota_on_intern_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ declare
  v_kuota constant int := 20;
  v_selesai date; v_awal date; v_akhir date; v_jumlah bigint;
begin
  v_selesai := coalesce(new.tanggal_selesai_custom,
    case when new.satuan_durasi = 'minggu' then (new.tanggal_mulai + (new.durasi_magang * 7))
         else (new.tanggal_mulai + make_interval(months => new.durasi_magang::int)) end);
  v_awal := date_trunc('month', new.tanggal_mulai)::date;
  v_akhir := date_trunc('month', v_selesai - 1)::date;
  while v_awal <= v_akhir loop
    select count(*) into v_jumlah from public.interns x
    where x.id <> new.id and x.status_magang <> 'Dropped'
      and date_trunc('month', x.tanggal_mulai) <= v_awal
      and date_trunc('month', x.tanggal_selesai) > v_awal;
    if v_jumlah >= v_kuota then
      raise exception 'Kuota bulan % penuh (maksimal % peserta aktif). Approve diblokir.',
        to_char(v_awal, 'YYYY-MM'), v_kuota;
    end if;
    v_awal := (v_awal + interval '1 month')::date;
  end loop;
  return new;
end $$;


ALTER FUNCTION "public"."enforce_quota_on_intern_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_attendance_stats"("p_intern_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
  v_intern_id UUID := p_intern_id;
  v_mulai DATE; v_akhir DATE;
  v_total_hari BIGINT := 0; v_hadir BIGINT := 0; v_izin BIGINT := 0; v_sakit BIGINT := 0;
  v_terlambat BIGINT := 0; v_rata_telat NUMERIC := 0;
  v_valid BIGINT := 0; v_alpha BIGINT := 0;
  v_persen NUMERIC; v_toleransi BIGINT := 0; v_status TEXT;
  v_target CONSTANT NUMERIC := 85;
BEGIN
  IF v_intern_id IS NULL THEN
    SELECT id INTO v_intern_id FROM public.interns WHERE user_id = auth.uid();
  END IF;
  IF v_intern_id IS NULL THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'Data intern tidak ditemukan.');
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND NOT public.is_own_intern(v_intern_id) AND NOT public.is_my_mentee(v_intern_id) THEN
    RETURN jsonb_build_object('error', TRUE, 'message', 'Tidak diizinkan melihat data ini.');
  END IF;
  SELECT i.tanggal_mulai, i.tanggal_selesai INTO v_mulai, v_akhir
  FROM public.interns i WHERE i.id = v_intern_id;
  v_akhir := LEAST(CURRENT_DATE, (v_akhir - INTERVAL '1 day'))::date;
  SELECT COUNT(*) INTO v_total_hari
  FROM generate_series(v_mulai, v_akhir, INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) < 6;
  SELECT
    COUNT(*) FILTER (WHERE a.status_kehadiran = 'Hadir'),
    COUNT(*) FILTER (WHERE a.status_kehadiran = 'Izin'),
    COUNT(*) FILTER (WHERE a.status_kehadiran = 'Sakit'),
    COUNT(*) FILTER (WHERE a.menit_terlambat IS NOT NULL),
    COALESCE(ROUND(AVG(a.menit_terlambat)), 0)
  INTO v_hadir, v_izin, v_sakit, v_terlambat, v_rata_telat
  FROM public.attendance a
  WHERE a.intern_id = v_intern_id
    AND a.tanggal_presensi BETWEEN v_mulai AND v_akhir
    AND EXTRACT(ISODOW FROM a.tanggal_presensi) < 6;
  v_valid := v_hadir + v_izin + v_sakit;
  v_alpha := GREATEST(v_total_hari - v_valid, 0);
  v_persen := CASE WHEN v_total_hari = 0 THEN NULL
                   ELSE ROUND(v_valid * 100.0 / v_total_hari, 2) END;
  v_toleransi := FLOOR(v_total_hari * (100 - v_target) / 100.0);
  v_status := CASE WHEN v_persen IS NULL THEN 'Belum Mulai'
                   WHEN v_persen >= v_target THEN 'Memenuhi Syarat'
                   ELSE 'Di Bawah Target' END;
  RETURN jsonb_build_object(
    'intern_id', v_intern_id, 'periode_mulai', v_mulai, 'periode_berjalan_sampai', v_akhir,
    'total_hari_kerja', v_total_hari, 'hadir', v_hadir, 'izin', v_izin, 'sakit', v_sakit,
    'alpha', v_alpha, 'terlambat', v_terlambat, 'rata_menit_terlambat', v_rata_telat,
    'persen_kehadiran', v_persen, 'target_persen', v_target,
    'toleransi_hari', v_toleransi, 'status', v_status);
END $$;


ALTER FUNCTION "public"."get_attendance_stats"("p_intern_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auto_penilaian"("p_intern_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
  v_stats jsonb;
  v_kehadiran numeric; v_terlambat bigint;
  v_base numeric; v_disiplin numeric;
  v_speed numeric; v_comp_map numeric; v_teknis numeric;
  v_total bigint; v_selesai bigint := 0; v_rate numeric;
  v_kualitas numeric; v_ada_projek boolean;
  v_detail jsonb := '[]'::jsonb;
  r record;
BEGIN
  -- ---------- 1. KEDISIPLINAN & ETIKA (dari presensi) ----------
  SELECT public.get_attendance_stats(p_intern_id) INTO v_stats;
  v_kehadiran := (v_stats->>'persen_kehadiran')::numeric;
  v_terlambat := coalesce((v_stats->>'terlambat')::bigint, 0);

  IF v_kehadiran IS NOT NULL THEN
    v_base := CASE
      WHEN v_kehadiran >= 96 THEN 5
      WHEN v_kehadiran >= 90 THEN 4.5
      WHEN v_kehadiran >= 85 THEN 4
      WHEN v_kehadiran >= 80 THEN 3.5
      ELSE 3
    END;
    v_disiplin := greatest(least(v_base - least(v_terlambat * 0.25, 1.5), 5), 3);
  END IF;

  -- ---------- 2 & 3. KECEPATAN & KOMPLETITAS SUBTUGAS ----------
  SELECT count(*) INTO v_total FROM public.subtasks WHERE intern_id = p_intern_id;

  FOR r IN
    SELECT judul, deadline, coalesce(submitted_at, selesai_at)::date AS tgl_kumpul
    FROM public.subtasks
    WHERE intern_id = p_intern_id
      AND status = 'Selesai'
      AND coalesce(submitted_at, selesai_at) IS NOT NULL
  LOOP
    v_selesai := v_selesai + 1;
    IF r.deadline IS NOT NULL THEN
      v_detail := v_detail || jsonb_build_object(
        'judul', r.judul,
        'deadline', to_char(r.deadline, 'DD Mon YYYY'),
        'kumpul', to_char(r.tgl_kumpul, 'DD Mon YYYY'),
        'selisih_hari', (r.deadline - r.tgl_kumpul),
        'skor', CASE
                  WHEN (r.deadline - r.tgl_kumpul) >= 3  THEN 5
                  WHEN (r.deadline - r.tgl_kumpul) >= 1  THEN 4.5
                  WHEN (r.deadline - r.tgl_kumpul) = 0   THEN 4
                  WHEN (r.deadline - r.tgl_kumpul) >= -2 THEN 3.5
                  ELSE 3
                END
      );
    END IF;
  END LOOP;

  SELECT avg((d->>'skor')::numeric) INTO v_speed
  FROM jsonb_array_elements(v_detail) d;

  v_rate := CASE WHEN v_total > 0 THEN round(v_selesai::numeric / v_total, 2) END;
  v_comp_map := CASE
    WHEN v_rate IS NULL THEN NULL
    WHEN v_rate >= 1   THEN 5
    WHEN v_rate >= 0.8 THEN 4.5
    WHEN v_rate >= 0.6 THEN 4
    WHEN v_rate >= 0.4 THEN 3.5
    ELSE 3
  END;

  IF v_speed IS NOT NULL AND v_comp_map IS NOT NULL THEN
    v_teknis := greatest(least(round(v_speed * 0.6 + v_comp_map * 0.4, 2), 5), 3);
  END IF;

  -- ---------- 4. KUALITAS HASIL KERJA (nilai projek) ----------
  SELECT EXISTS(SELECT 1 FROM public.subtasks WHERE intern_id = p_intern_id)
    INTO v_ada_projek;
  SELECT round(avg(nilai), 2) INTO v_kualitas
  FROM public.project_grades WHERE intern_id = p_intern_id;

  RETURN jsonb_build_object(
    'disiplin', jsonb_build_object(
      'nilai', v_disiplin, 'kehadiran', v_kehadiran, 'terlambat', v_terlambat,
      'rumus', CASE WHEN v_base IS NULL THEN NULL ELSE
        'dasar ' || v_base::text || ' (kehadiran ' || v_kehadiran::text || '%) - ' ||
        least(v_terlambat * 0.25, 1.5)::text || ' (terlambat ' || v_terlambat::text || 'x)' END
    ),
    'pemecahan', jsonb_build_object(
      'nilai', CASE WHEN v_speed IS NULL THEN NULL ELSE greatest(least(round(v_speed, 2), 5), 3) END,
      'jumlah_tugas_berdeadline', jsonb_array_length(v_detail),
      'detail', v_detail
    ),
    'teknis', jsonb_build_object(
      'nilai', v_teknis, 'kecepatan', v_speed,
      'selesai', v_selesai, 'total', v_total, 'rate', v_rate, 'rate_map', v_comp_map,
      'rumus', CASE WHEN v_teknis IS NULL THEN NULL ELSE
        '60% kecepatan (' || round(v_speed, 2)::text || ') + 40% kompletitas (' || v_comp_map::text || ')' END
    ),
    'kualitas', jsonb_build_object('nilai', v_kualitas, 'ada_projek', v_ada_projek)
  );
END $$;


ALTER FUNCTION "public"."get_auto_penilaian"("p_intern_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_mentor"() RETURNS TABLE("nama_lengkap" "text", "email" "text", "nomor_whatsapp" "text", "nama_kelompok" "text", "batch_label" "text", "bergabung" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_group UUID;
BEGIN
  SELECT group_id INTO v_group FROM public.interns WHERE user_id = auth.uid();
  IF v_group IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.nama_lengkap, p.email, p.nomor_whatsapp,
         g.nama_kelompok, g.batch_label, p.created_at
  FROM public.groups g
  LEFT JOIN public.profiles p ON p.id = g.mentor_id
  WHERE g.id = v_group;
END $$;


ALTER FUNCTION "public"."get_my_mentor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_directory"() RETURNS TABLE("id" "uuid", "nama_lengkap" "text", "role" "public"."role")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT p.id, p.nama_lengkap, p.role FROM public.profiles p ORDER BY p.nama_lengkap;
 $$;


ALTER FUNCTION "public"."get_profile_directory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quota_usage"("p_mulai" "date" DEFAULT ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date", "p_jumlah_bulan" integer DEFAULT 12) RETURNS TABLE("bulan" "date", "bulan_label" "text", "kuota_maks" integer, "kuota_terisi" bigint, "kuota_tersisa" bigint, "persen_terisi" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   WITH bulan_seq AS (
    SELECT (date_trunc('month', p_mulai) + make_interval(months => gs))::date AS tgl
    FROM generate_series(0, GREATEST(p_jumlah_bulan - 1, 0)) AS gs
  )
  SELECT bs.tgl, to_char(bs.tgl, 'YYYY-MM'), 20, u.terisi, 20 - u.terisi,
         ROUND(u.terisi * 100.0 / 20, 2)
  FROM bulan_seq bs
  CROSS JOIN LATERAL (
    SELECT COUNT(*) AS terisi FROM public.interns i
    WHERE i.status_magang <> 'Dropped'
      AND date_trunc('month', i.tanggal_mulai) <= bs.tgl
      AND (date_trunc('month', i.tanggal_mulai) + make_interval(months => i.durasi_magang::int)) > bs.tgl
  ) u
  ORDER BY bs.tgl;
 $$;


ALTER FUNCTION "public"."get_quota_usage"("p_mulai" "date", "p_jumlah_bulan" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."huruf_ke_skala"("p" "public"."nilai_huruf") RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    AS $$   SELECT CASE p WHEN 'A' THEN 5 WHEN 'B' THEN 4.5 WHEN 'C' THEN 4
                WHEN 'D' THEN 3.5 WHEN 'E' THEN 3 END
 $$;


ALTER FUNCTION "public"."huruf_ke_skala"("p" "public"."nilai_huruf") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_reminder_notifikasi"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  -- belum check-in
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT i.user_id, 'in_app', '⏰ Belum Check-in',
    'Hari ini kamu belum melakukan check-in presensi. Yuk check-in sekarang!', 'Sent'
  FROM public.interns i
  WHERE i.status_magang = 'Active'
    AND i.tanggal_mulai <= CURRENT_DATE AND CURRENT_DATE < i.tanggal_selesai
    AND EXTRACT(ISODOW FROM CURRENT_DATE) < 6
    AND NOT EXISTS (SELECT 1 FROM public.attendance a
                    WHERE a.intern_id = i.id AND a.tanggal_presensi = CURRENT_DATE)
    AND NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = i.user_id AND n.judul = '⏰ Belum Check-in'
                      AND n.created_at::date = CURRENT_DATE);

  -- deadline besok
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT i.user_id, 'in_app', '⏳ Deadline Besok',
    'Tugas "' || s.judul || '" tenggatnya BESOK (' || to_char(s.deadline, 'DD Mon YYYY') || '). Pastikan sudah dikumpulkan!', 'Sent'
  FROM public.subtasks s JOIN public.interns i ON i.id = s.intern_id
  WHERE s.status <> 'Selesai' AND s.deadline = CURRENT_DATE + 1
    AND NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = i.user_id AND n.judul = '⏳ Deadline Besok'
                      AND n.created_at::date = CURRENT_DATE AND n.pesan LIKE '%' || s.judul || '%');

  -- deadline hari ini
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT i.user_id, 'in_app', '🔥 Deadline HARI INI',
    'Tugas "' || s.judul || '" tenggatnya HARI INI. Segera kumpulkan!', 'Sent'
  FROM public.subtasks s JOIN public.interns i ON i.id = s.intern_id
  WHERE s.status <> 'Selesai' AND s.deadline = CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = i.user_id AND n.judul = '🔥 Deadline HARI INI'
                      AND n.created_at::date = CURRENT_DATE AND n.pesan LIKE '%' || s.judul || '%');

  -- terlambat
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT i.user_id, 'in_app', '⚠️ Tugas Terlambat',
    'Tugas "' || s.judul || '" sudah melewati tenggat (' || to_char(s.deadline, 'DD Mon YYYY') || '). Segera selesaikan!', 'Sent'
  FROM public.subtasks s JOIN public.interns i ON i.id = s.intern_id
  WHERE s.status <> 'Selesai' AND s.deadline < CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = i.user_id AND n.judul = '⚠️ Tugas Terlambat'
                      AND n.created_at::date = CURRENT_DATE AND n.pesan LIKE '%' || s.judul || '%');

  -- review menunggu → mentor
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT g.mentor_id, 'in_app', '🔍 Review Menunggu',
    'Subtugas "' || s.judul || '" dari ' || i.nama_lengkap ||
    ' sudah menunggu review lebih dari sehari. Segera beri nilai A–E.', 'Sent'
  FROM public.subtasks s
  JOIN public.interns i ON i.id = s.intern_id
  JOIN public.groups g ON g.id = i.group_id
  WHERE s.status = 'Menunggu Review'
    AND s.submitted_at < NOW() - INTERVAL '24 hours'
    AND g.mentor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = g.mentor_id AND n.judul = '🔍 Review Menunggu'
                      AND n.created_at::date = CURRENT_DATE AND n.pesan LIKE '%' || s.judul || '%');
END $$;


ALTER FUNCTION "public"."insert_reminder_notifikasi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
 $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_member"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns
    WHERE user_id = auth.uid() AND group_id = p_group_id
  );
 $$;


ALTER FUNCTION "public"."is_group_member"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_mentor"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND mentor_id = auth.uid());
 $$;


ALTER FUNCTION "public"."is_group_mentor"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_mentor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'mentor');
 $$;


ALTER FUNCTION "public"."is_mentor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_my_mentee"("p_intern_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns i
    JOIN public.groups g ON g.id = i.group_id
    WHERE i.id = p_intern_id AND g.mentor_id = auth.uid()
  );
 $$;


ALTER FUNCTION "public"."is_my_mentee"("p_intern_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_own_intern"("p_intern_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (SELECT 1 FROM public.interns WHERE id = p_intern_id AND user_id = auth.uid());
 $$;


ALTER FUNCTION "public"."is_own_intern"("p_intern_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teammate"("p_intern_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$   SELECT EXISTS (
    SELECT 1 FROM public.interns me
    JOIN public.interns other ON other.group_id = me.group_id
    WHERE me.user_id = auth.uid()
      AND me.group_id IS NOT NULL
      AND other.id = p_intern_id
  );
 $$;


ALTER FUNCTION "public"."is_teammate"("p_intern_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_alpha_yesterday"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_count INT;
BEGIN
  INSERT INTO public.attendance (intern_id, tanggal_presensi, status_kehadiran)
  SELECT i.id, CURRENT_DATE - 1, 'Alpha'
  FROM public.interns i
  WHERE i.status_magang = 'Active'
    AND i.tanggal_mulai <= CURRENT_DATE - 1
    AND (CURRENT_DATE - 1) < i.tanggal_selesai
    AND EXTRACT(ISODOW FROM (CURRENT_DATE - 1)) < 6
    AND NOT EXISTS (SELECT 1 FROM public.attendance a
                    WHERE a.intern_id = i.id AND a.tanggal_presensi = CURRENT_DATE - 1)
  ON CONFLICT (intern_id, tanggal_presensi) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;


ALTER FUNCTION "public"."mark_alpha_yesterday"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."max_durasi"("p_satuan" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$   select case when p_satuan = 'minggu' then 26 else 6 end
 $$;


ALTER FUNCTION "public"."max_durasi"("p_satuan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_admin"("p_judul" "text", "p_pesan" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT id, 'in_app', p_judul, p_pesan, 'Sent'
  FROM public.profiles WHERE role = 'admin';
END $$;


ALTER FUNCTION "public"."notif_admin"("p_judul" "text", "p_pesan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_approve"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_user UUID;
BEGIN
  IF NEW.status_pendaftaran = 'Approved' AND OLD.status_pendaftaran IS DISTINCT FROM 'Approved' THEN
    SELECT user_id INTO v_user FROM public.interns WHERE application_id = NEW.id;
    PERFORM public.buat_notifikasi(v_user, '🎉 Selamat, Kamu Lolos!',
      'Pengajuan magangmu DISETUJUI! Selamat bergabung di Creativemu Academy. Jangan lupa check-in presensi setiap hari kerja.');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_approve"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_izin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_nama TEXT; v_user UUID;
BEGIN
  SELECT nama_lengkap, user_id INTO v_nama, v_user FROM public.interns WHERE id = NEW.intern_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notif_admin('Pengajuan Izin Baru',
      v_nama || ' mengajukan ' || NEW.jenis_izin::text || ' (' ||
      to_char(NEW.tanggal_mulai, 'DD Mon') || ' s.d. ' || to_char(NEW.tanggal_selesai, 'DD Mon') ||
      '): "' || LEFT(NEW.alasan, 80) || '".');
    RETURN NEW;
  END IF;

  IF NEW.status_izin = 'Approved' AND OLD.status_izin IS DISTINCT FROM 'Approved' THEN
    IF NEW.jenis_izin = 'WFH' THEN
      PERFORM public.buat_notifikasi(v_user, '✅ Izin WFH Disetujui',
        'Pengajuan WFH kamu DISETUJUI — kamu bisa presensi dari mana saja hari ini (GPS tidak diperlukan). Presensimu tetap tercatat Hadir.');
    ELSIF NEW.jenis_izin = 'Terlambat' THEN
      PERFORM public.buat_notifikasi(v_user, '✅ Izin Telat Disetujui',
        'Pengajuan Izin Telat kamu DISETUJUI — kamu bisa check-in kapan saja hari ini tanpa terhitung terlambat. Tetap presensi dari lokasi kantor ya!');
    ELSIF NEW.jenis_izin = 'Sakit' THEN
      PERFORM public.buat_notifikasi(v_user, '✅ Izin Disetujui',
        'Pengajuan Sakit kamu (' || to_char(NEW.tanggal_mulai, 'DD Mon YYYY') || ') DISETUJUI — tercatat sebagai presensi Sakit (tidak mengurangi nilai kedisiplinan).');
    ELSE
      PERFORM public.buat_notifikasi(v_user, '✅ Izin Disetujui',
        'Pengajuan Izin kamu (' || to_char(NEW.tanggal_mulai, 'DD Mon YYYY') || ') DISETUJUI — tercatat sebagai presensi Izin (tidak mengurangi nilai kedisiplinan).');
    END IF;
  ELSIF NEW.status_izin = 'Rejected' AND OLD.status_izin IS DISTINCT FROM 'Rejected' THEN
    PERFORM public.buat_notifikasi(v_user, '❌ Izin Ditolak',
      'Pengajuan ' || NEW.jenis_izin::text || ' kamu ditolak.' ||
      CASE WHEN NEW.catatan_reviewer IS NOT NULL THEN ' Catatan: ' || NEW.catatan_reviewer ELSE '' END);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_izin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_kelompok"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_mentor UUID; v_kelompok TEXT;
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id AND NEW.group_id IS NOT NULL THEN
    SELECT mentor_id, nama_kelompok INTO v_mentor, v_kelompok
    FROM public.groups WHERE id = NEW.group_id;
    PERFORM public.buat_notifikasi(v_mentor, '👥 Anggota Baru di Kelompok',
      NEW.nama_lengkap || ' bergabung ke kelompok "' || COALESCE(v_kelompok, '-') || '". Cek Kelompok Binaanmu!');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_kelompok"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_mentoring_baru"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  INSERT INTO public.notifications (user_id, channel, judul, pesan, status_kirim)
  SELECT i.user_id, 'in_app', '📅 Jadwal Mentoring Baru',
    'Sesi "' || NEW.judul_sesi || '" dijadwalkan: ' ||
    to_char(NEW.tanggal_waktu AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') || ' WIB' ||
    CASE WHEN NEW.link_meeting IS NOT NULL THEN ' — ' || NEW.link_meeting ELSE '' END,
    'Sent'   -- ⭐ kolom ke-5 yang hilang
  FROM public.interns i
  WHERE i.group_id = NEW.group_id AND i.status_magang = 'Active';
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_mentoring_baru"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_pengajuan_baru"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  PERFORM public.notif_admin('📥 Pengajuan Magang Baru',
    NEW.nama_lengkap || ' (' || COALESCE(NEW.instansi, '-') || ') mendaftar, mulai ' ||
    to_char(NEW.tanggal_mulai, 'DD Mon YYYY') || ', durasi ' || NEW.durasi_magang::text ||
    ' bulan. Cek menu Pengajuan Magang.');
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_pengajuan_baru"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_pulang_awal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_nama TEXT; v_user UUID;
BEGIN
  SELECT nama_lengkap, user_id INTO v_nama, v_user FROM public.interns WHERE id = NEW.intern_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notif_admin('🏃 Pengajuan Pulang Awal',
      v_nama || ' ingin check-out lebih awal (' || to_char(NEW.tanggal, 'DD Mon') || '): "' ||
      LEFT(NEW.alasan, 80) || '". Konfirmasi di menu Persetujuan Izin.');
    RETURN NEW;
  END IF;

  IF NEW.status = 'Approved' AND OLD.status IS DISTINCT FROM 'Approved' THEN
    PERFORM public.buat_notifikasi(v_user, '✅ Pulang Awal Disetujui',
      'Pengajuan pulang awalmu DISETUJUI — kamu bisa check-out sekarang. Presensimu tetap tercatat Hadir.');
  ELSIF NEW.status = 'Rejected' AND OLD.status IS DISTINCT FROM 'Rejected' THEN
    PERFORM public.buat_notifikasi(v_user, '❌ Pulang Awal Ditolak',
      'Pengajuan pulang awalmu ditolak admin. Check-out tetap dibuka pukul 17:00.');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_pulang_awal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_selesai_magang"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF NEW.status_magang = 'Completed' AND OLD.status_magang IS DISTINCT FROM 'Completed' THEN
    PERFORM public.notif_admin('🎓 Peserta Selesai Magang',
      NEW.nama_lengkap || ' telah menyelesaikan masa magang (nilai akhir: ' ||
      COALESCE(NEW.nilai_final::text, '-') || '). Siap terbitkan sertifikat di menu Sertifikat.');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_selesai_magang"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_subtugas_baru"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  PERFORM public.buat_notifikasi(
    (SELECT user_id FROM public.interns WHERE id = NEW.intern_id),
    '📌 Tugas Baru',
    'Kamu mendapat tugas baru: "' || NEW.judul || '".' ||
    CASE WHEN NEW.deadline IS NOT NULL
      THEN ' Tenggat: ' || to_char(NEW.deadline, 'DD Mon YYYY') || '.' ELSE '' END ||
    ' Cek di menu Projek & Tugas.');
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_subtugas_baru"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_subtugas_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_user UUID; v_mentor UUID; v_nama TEXT;
BEGIN
  SELECT user_id, nama_lengkap INTO v_user, v_nama FROM public.interns WHERE id = NEW.intern_id;
  SELECT g.mentor_id INTO v_mentor
  FROM public.interns i JOIN public.groups g ON g.id = i.group_id
  WHERE i.id = NEW.intern_id;

  -- peserta mengumpulkan → ingatkan mentor
  IF NEW.status = 'Menunggu Review' AND OLD.status IS DISTINCT FROM 'Menunggu Review' THEN
    PERFORM public.buat_notifikasi(v_mentor, '🔍 Tugas Menunggu Review',
      'Subtugas "' || NEW.judul || '" dari ' || v_nama ||
      ' sudah dikumpulkan. Segera beri nilai A–E di Kelompok Binaan.');
  END IF;

  -- direvisi → intern
  IF NEW.status = 'Revisi' AND OLD.status IS DISTINCT FROM 'Revisi' THEN
    PERFORM public.buat_notifikasi(v_user, '🔁 Tugas Perlu Revisi',
      'Tugas "' || NEW.judul || '" dikembalikan. Catatan pembimbing: ' ||
      COALESCE(NEW.catatan_revisi, '-'));
  END IF;

  -- dinilai → intern
  IF NEW.nilai IS NOT NULL AND OLD.nilai IS NULL THEN
    PERFORM public.buat_notifikasi(v_user, '✅ Tugas Dinilai',
      'Tugas "' || NEW.judul || '" disetujui. Nilaimu: ' || NEW.nilai::text || ' — mantap! 🎉');
  END IF;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_subtugas_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_wa_berubah"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF NEW.nomor_whatsapp IS DISTINCT FROM OLD.nomor_whatsapp
     AND NEW.role IN ('intern','mentor') THEN
    PERFORM public.notif_admin('📱 Nomor WhatsApp Diperbarui',
      NEW.nama_lengkap || ' (' || NEW.role::text || ') mengubah nomor WhatsApp menjadi: ' ||
      COALESCE(NEW.nomor_whatsapp, '(dikosongkan)') || '.');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notif_wa_berubah"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF (NEW.role <> OLD.role OR NEW.email <> OLD.email)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Kolom role/email profiles hanya boleh diubah oleh admin.';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."protect_profile_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_project_grade"("p_intern" "uuid", "p_project" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_avg NUMERIC;
BEGIN
  SELECT round(avg(public.huruf_ke_skala(nilai)), 2) INTO v_avg
  FROM public.subtasks
  WHERE intern_id = p_intern AND project_id = p_project AND nilai IS NOT NULL;

  IF v_avg IS NOT NULL THEN
    INSERT INTO public.project_grades (project_id, intern_id, nilai, catatan)
    VALUES (p_project, p_intern, v_avg, 'otomatis — rata-rata nilai subtugas (A–E)')
    ON CONFLICT (project_id, intern_id) DO UPDATE
      SET nilai = excluded.nilai, catatan = excluded.catatan, updated_at = now();
  ELSE
    DELETE FROM public.project_grades WHERE project_id = p_project AND intern_id = p_intern;
  END IF;
END $$;


ALTER FUNCTION "public"."recalc_project_grade"("p_intern" "uuid", "p_project" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_project_grade_weighted"("p_intern" "uuid", "p_project" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
  v_total_bobot NUMERIC := 0;
  v_nilai_bobot NUMERIC := 0;
  v_jumlah_total INT := 0;
  v_jumlah_selesai INT := 0;
  r RECORD;
  v_bobot_default NUMERIC;
BEGIN
  SELECT COUNT(*), COUNT(nilai) INTO v_jumlah_total, v_jumlah_selesai
  FROM public.subtasks
  WHERE intern_id = p_intern AND project_id = p_project;

  IF v_jumlah_total = 0 OR v_jumlah_selesai = 0 THEN RETURN; END IF;

  v_bobot_default := 100.0 / v_jumlah_total;

  FOR r IN
    SELECT COALESCE(s.bobot, v_bobot_default) AS bobot,
           public.huruf_ke_skala(s.nilai) AS nilai
    FROM public.subtasks s
    WHERE s.intern_id = p_intern AND s.project_id = p_project AND s.nilai IS NOT NULL
  LOOP
    v_total_bobot := v_total_bobot + r.bobot;
    v_nilai_bobot := v_nilai_bobot + (r.nilai * r.bobot / 100);
  END LOOP;

  -- Aturan: tunggu total bobot = 100% baru hitung
  IF v_total_bobot < 100 THEN RETURN; END IF;

  INSERT INTO public.project_grades (project_id, intern_id, nilai, catatan)
  VALUES (p_project, p_intern, ROUND(v_nilai_bobot, 2), 'otomatis — rata-rata berbobot')
  ON CONFLICT (project_id, intern_id) DO UPDATE
    SET nilai = excluded.nilai, catatan = excluded.catatan, updated_at = now();
END $$;


ALTER FUNCTION "public"."recalc_project_grade_weighted"("p_intern" "uuid", "p_project" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tanggal_selesai"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ begin
  if new.tanggal_selesai_custom is not null then
    new.tanggal_selesai := new.tanggal_selesai_custom;
  elsif new.satuan_durasi = 'minggu' then
    new.tanggal_selesai := (new.tanggal_mulai + (new.durasi_magang * 7))::date;
  else
    new.tanggal_selesai := (new.tanggal_mulai + make_interval(months => new.durasi_magang::int))::date;
  end if;
  if new.tanggal_selesai <= new.tanggal_mulai then
    raise exception 'Tanggal selesai harus setelah tanggal mulai.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."set_tanggal_selesai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_nomor_wa"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF NEW.nomor_whatsapp IS DISTINCT FROM OLD.nomor_whatsapp THEN
    UPDATE public.interns
    SET nomor_whatsapp = NEW.nomor_whatsapp
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."sync_nomor_wa"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_rubrik_soft_hard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF NEW.nilai_inisiatif IS NOT NULL AND NEW.nilai_komunikasi IS NOT NULL AND NEW.nilai_disiplin IS NOT NULL THEN
    NEW.nilai_soft_skill := round(((NEW.nilai_inisiatif + NEW.nilai_komunikasi + NEW.nilai_disiplin) / 3.0) / 5.0 * 100, 2);
  END IF;
  IF NEW.nilai_pemecahan IS NOT NULL AND NEW.nilai_teknis IS NOT NULL AND NEW.nilai_kualitas IS NOT NULL THEN
    NEW.nilai_hard_skill := round(((NEW.nilai_pemecahan + NEW.nilai_teknis + NEW.nilai_kualitas) / 3.0) / 5.0 * 100, 2);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."sync_rubrik_soft_hard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_subtasks_nilai"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  IF TG_OP = 'UPDATE' AND NEW.nilai IS DISTINCT FROM OLD.nilai THEN
    PERFORM public.recalc_project_grade(NEW.intern_id, NEW.project_id);
  ELSIF TG_OP = 'DELETE' AND OLD.nilai IS NOT NULL THEN
    PERFORM public.recalc_project_grade(OLD.intern_id, OLD.project_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."trg_subtasks_nilai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validasi_izin_tanggal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_mulai DATE; v_selesai DATE;
BEGIN
  SELECT tanggal_mulai, tanggal_selesai INTO v_mulai, v_selesai
    FROM public.interns WHERE id = NEW.intern_id;
  IF v_mulai IS NOT NULL THEN
    IF NEW.tanggal_mulai < v_mulai OR NEW.tanggal_selesai >= v_selesai THEN
      RAISE EXCEPTION 'Tanggal izin harus dalam masa magang aktif (% s.d. %).',
        to_char(v_mulai, 'DD Mon YYYY'), to_char(v_selesai - 1, 'DD Mon YYYY');
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."validasi_izin_tanggal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validasi_presensi"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
  v_lat NUMERIC; v_lng NUMERIC; v_radius INT;
  v_jarak DOUBLE PRECISION;
  v_mulai DATE; v_selesai DATE;
  v_wfh_approved BOOLEAN := FALSE;
  v_telat_approved BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL THEN

    SELECT tanggal_mulai, tanggal_selesai INTO v_mulai, v_selesai
      FROM public.interns WHERE id = NEW.intern_id;
    IF NEW.tanggal_presensi < v_mulai OR NEW.tanggal_presensi >= v_selesai THEN
      RAISE EXCEPTION 'Presensi terkunci: masa magang belum dimulai atau sudah berakhir (periode aktif: % s.d. %).',
        v_mulai, (v_selesai - 1);
    END IF;

    -- ===== ⭐ CEK IZIN WFH & TELAT YANG DI-APPROVE UNTUK HARI INI =====
    SELECT
      EXISTS(SELECT 1 FROM public.leave_requests
             WHERE intern_id = NEW.intern_id
               AND jenis_izin = 'WFH'
               AND status_izin = 'Approved'
               AND NEW.tanggal_presensi BETWEEN tanggal_mulai AND tanggal_selesai)
    INTO v_wfh_approved;

    SELECT
      EXISTS(SELECT 1 FROM public.leave_requests
             WHERE intern_id = NEW.intern_id
               AND jenis_izin = 'Terlambat'
               AND status_izin = 'Approved'
               AND NEW.tanggal_presensi BETWEEN tanggal_mulai AND tanggal_selesai)
    INTO v_telat_approved;

    SELECT latitude, longitude, radius_meter INTO v_lat, v_lng, v_radius
      FROM public.kantor WHERE id = 1;

    ---------- CHECK-IN (INSERT) ----------
    IF TG_OP = 'INSERT' AND NEW.check_in IS NOT NULL
       AND NEW.status_kehadiran = 'Hadir' THEN

      -- ===== GPS: skip jika WFH approved =====
      IF v_wfh_approved THEN
        -- WFH: tidak perlu GPS, boleh dari mana saja
        -- langsung skip GPS check
        IF (NEW.check_in AT TIME ZONE 'Asia/Jakarta')::TIME < '08:00' THEN
          RAISE EXCEPTION 'Presensi gagal: check-in dibuka pukul 08:00 WIB.';
        END IF;
        -- WFH: tidak ada penalti keterlambatan
      ELSE
        -- Normal: GPS wajib
        IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
          RAISE EXCEPTION 'Presensi gagal: lokasi GPS wajib diaktifkan.';
        END IF;

        v_jarak := 6371000 * 2 * asin(sqrt(
          power(sin(radians(NEW.latitude - v_lat) / 2), 2) +
          cos(radians(v_lat)) * cos(radians(NEW.latitude)) *
          power(sin(radians(NEW.longitude - v_lng) / 2), 2)
        ));
        IF v_jarak > v_radius THEN
          RAISE EXCEPTION 'Presensi gagal: kamu ±% meter dari kantor (maksimal % m).',
            ROUND(v_jarak::NUMERIC), v_radius;
        END IF;

        IF (NEW.check_in AT TIME ZONE 'Asia/Jakarta')::TIME < '08:00' THEN
          RAISE EXCEPTION 'Presensi gagal: check-in baru dibuka pukul 08:00 WIB.';
        END IF;

        -- Terlambat: skip penalti jika approved
        IF NOT v_telat_approved THEN
          IF (NEW.check_in AT TIME ZONE 'Asia/Jakarta')::TIME > '08:05' THEN
            NEW.menit_terlambat := CEIL(
              EXTRACT(EPOCH FROM ((NEW.check_in AT TIME ZONE 'Asia/Jakarta')::TIME - '08:05'::TIME)) / 60)::INT;
          END IF;
        END IF;
      END IF;
    END IF;

    ---------- CHECK-OUT (UPDATE) ----------
    IF TG_OP = 'UPDATE' AND NEW.check_out IS NOT NULL
       AND OLD.check_out IS NULL THEN

      IF NEW.checkout_latitude IS NULL OR NEW.checkout_longitude IS NULL THEN
        RAISE EXCEPTION 'Check-out gagal: lokasi GPS wajib diaktifkan.';
      END IF;

      -- GPS check-out: skip jika WFH approved
      IF NOT v_wfh_approved THEN
        v_jarak := 6371000 * 2 * asin(sqrt(
          power(sin(radians(NEW.checkout_latitude - v_lat) / 2), 2) +
          cos(radians(v_lat)) * cos(radians(NEW.checkout_latitude)) *
          power(sin(radians(NEW.checkout_longitude - v_lng) / 2), 2)
        ));
        IF v_jarak > v_radius THEN
          RAISE EXCEPTION 'Check-out gagal: kamu ±% meter dari kantor (maksimal % m).',
            ROUND(v_jarak::NUMERIC), v_radius;
        END IF;
      END IF;

      -- Check-out: WFH approved = boleh kapan saja
      IF (NEW.check_out AT TIME ZONE 'Asia/Jakarta')::TIME < '17:00' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.early_checkouts ec
          WHERE ec.intern_id = NEW.intern_id AND ec.tanggal = NEW.tanggal_presensi
            AND ec.status = 'Approved'
        ) AND NOT v_wfh_approved THEN
          RAISE EXCEPTION 'Check-out gagal: baru dibuka 17:00 WIB. Ajukan "Pulang Awal" jika perlu.';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."validasi_presensi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validasi_subtugas"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  -- ⭐ Peserta tidak boleh menyetujui subtugasnya sendiri
  IF NEW.status = 'Selesai' AND OLD.status <> 'Selesai'
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NOT public.is_my_mentee(NEW.intern_id) THEN
    RAISE EXCEPTION 'Subtugas hanya bisa disetujui (Selesai) oleh pembimbing.';
  END IF;

  -- ⭐ Wajib lampiran saat mengumpulkan (masuk Menunggu Review)
  IF NEW.status = 'Menunggu Review' AND OLD.status <> 'Menunggu Review'
     AND NEW.file_bukti IS NULL THEN
    RAISE EXCEPTION 'Lampirkan file/laporan untuk mengumpulkan subtugas ini.';
  END IF;

  RETURN NEW;
END;
 $$;


ALTER FUNCTION "public"."validasi_subtugas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validasi_subtugas_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_mulai DATE;
BEGIN
  SELECT tanggal_mulai INTO v_mulai FROM public.interns WHERE id = NEW.intern_id;
  IF v_mulai IS NOT NULL AND v_mulai > CURRENT_DATE THEN
    RAISE EXCEPTION 'Peserta ini belum memulai masa magang (mulai %). Tugas belum bisa diberikan.',
      to_char(v_mulai, 'DD Mon YYYY');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."validasi_subtugas_insert"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_suspensions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "alasan" "text" NOT NULL,
    "suspended_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."account_suspensions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama_lengkap" "text" NOT NULL,
    "email" "text" NOT NULL,
    "nomor_whatsapp" "text" NOT NULL,
    "cv_url" "text",
    "portofolio_url" "text",
    "tanggal_mulai" "date" NOT NULL,
    "durasi_magang" smallint NOT NULL,
    "status_pendaftaran" "public"."status_pendaftaran" DEFAULT 'Pending'::"public"."status_pendaftaran" NOT NULL,
    "catatan_admin" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instansi" "text",
    "satuan_durasi" "text" DEFAULT 'bulan'::"text" NOT NULL,
    "tanggal_selesai_custom" "date",
    "divisi" "public"."divisi" DEFAULT 'Admin'::"public"."divisi" NOT NULL,
    CONSTRAINT "applications_durasi_magang_check" CHECK ((("durasi_magang" >= 1) AND ("durasi_magang" <= 26)))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "tanggal_presensi" "date" DEFAULT CURRENT_DATE NOT NULL,
    "check_in" timestamp with time zone,
    "check_out" timestamp with time zone,
    "status_kehadiran" "public"."status_kehadiran" DEFAULT 'Hadir'::"public"."status_kehadiran" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "checkout_latitude" numeric(9,6),
    "checkout_longitude" numeric(9,6),
    "menit_terlambat" integer
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "nomor_sertifikat" "text",
    "nis_nim" "text",
    "jurusan" "text",
    "tanggal_diterbitkan" "date" DEFAULT CURRENT_DATE,
    "pimpinan" "text" DEFAULT 'AGUS SUSANTO'::"text" NOT NULL,
    "nomor_ijin" "text" DEFAULT '02280102314140006'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_url" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."division_quotas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bulan" "text" NOT NULL,
    "divisi" "public"."divisi" NOT NULL,
    "kuota" integer DEFAULT 5 NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "division_quotas_kuota_check" CHECK (("kuota" >= 0))
);


ALTER TABLE "public"."division_quotas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."early_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "tanggal" "date" DEFAULT CURRENT_DATE NOT NULL,
    "alasan" "text" NOT NULL,
    "status" "public"."status_izin" DEFAULT 'Pending'::"public"."status_izin" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."early_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama_kelompok" "text" NOT NULL,
    "batch_label" "text",
    "mentor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "application_id" "uuid",
    "nama_lengkap" "text" NOT NULL,
    "email" "text" NOT NULL,
    "nomor_whatsapp" "text",
    "group_id" "uuid",
    "tanggal_mulai" "date" NOT NULL,
    "durasi_magang" smallint NOT NULL,
    "status_magang" "public"."status_magang" DEFAULT 'Active'::"public"."status_magang" NOT NULL,
    "nilai_final" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instansi" "text",
    "keterangan_sertifikat" "text",
    "tanggal_selesai" "date",
    "satuan_durasi" "text" DEFAULT 'bulan'::"text" NOT NULL,
    "tanggal_selesai_custom" "date",
    "divisi" "public"."divisi" DEFAULT 'Admin'::"public"."divisi" NOT NULL,
    CONSTRAINT "interns_durasi_magang_check" CHECK ((("durasi_magang" >= 1) AND ("durasi_magang" <= 26)))
);


ALTER TABLE "public"."interns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kanban_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "assignment_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judul_tugas" "text" NOT NULL,
    "deskripsi_tugas" "text",
    "status_tugas" "public"."status_kanban" DEFAULT 'To-Do'::"public"."status_kanban" NOT NULL,
    "file_bukti" "text",
    "catatan_pengumpulan" "text",
    "catatan_revisi" "text",
    "deadline_tugas" "date",
    "posisi" smallint DEFAULT 0 NOT NULL,
    "assigned_by" "uuid",
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kanban_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kantor" (
    "id" integer DEFAULT 1 NOT NULL,
    "nama" "text" DEFAULT 'Kantor Creativemu Academy'::"text" NOT NULL,
    "latitude" numeric(9,6) NOT NULL,
    "longitude" numeric(9,6) NOT NULL,
    "radius_meter" integer DEFAULT 100 NOT NULL,
    CONSTRAINT "kantor_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."kantor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "jenis_izin" "public"."jenis_izin" NOT NULL,
    "tanggal_mulai" "date" NOT NULL,
    "tanggal_selesai" "date" NOT NULL,
    "alasan" "text" NOT NULL,
    "bukti_url" "text",
    "status_izin" "public"."status_izin" DEFAULT 'Pending'::"public"."status_izin" NOT NULL,
    "reviewed_by" "uuid",
    "catatan_reviewer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "leave_range_valid" CHECK (("tanggal_selesai" >= "tanggal_mulai"))
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "tanggal" "date" DEFAULT CURRENT_DATE NOT NULL,
    "judul" "text" NOT NULL,
    "isi" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logbook" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentoring_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "mentor_id" "uuid" NOT NULL,
    "judul_sesi" "text" NOT NULL,
    "tanggal_waktu" timestamp with time zone NOT NULL,
    "platform" "text",
    "link_meeting" "text",
    "catatan" "text",
    "status_sesi" "public"."status_sesi" DEFAULT 'Scheduled'::"public"."status_sesi" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mentoring_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "application_id" "uuid",
    "channel" "public"."channel_notifikasi" DEFAULT 'in_app'::"public"."channel_notifikasi" NOT NULL,
    "recipient_email" "text",
    "recipient_phone" "text",
    "judul" "text",
    "pesan" "text" NOT NULL,
    "status_kirim" "public"."status_pengiriman" DEFAULT 'Pending'::"public"."status_pengiriman" NOT NULL,
    "error_message" "text",
    "provider_ref" "text",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nama_lengkap" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."role" DEFAULT 'intern'::"public"."role" NOT NULL,
    "nomor_whatsapp" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "password_tercatat" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "nilai" numeric(2,1) NOT NULL,
    "catatan" "text",
    "graded_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_grades_nilai_check" CHECK ((("nilai" >= (3)::numeric) AND ("nilai" <= (5)::numeric)))
);


ALTER TABLE "public"."project_grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "mentor_id" "uuid",
    "judul_projek" "text" NOT NULL,
    "deskripsi" "text",
    "deadline_projek" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."quota_overview" AS
 WITH "bulan_target" AS (
         SELECT ("date_trunc"('month'::"text", (CURRENT_DATE + (("n"."n" || ' month'::"text"))::interval)))::"date" AS "awal_bulan",
            "n"."n" AS "urutan"
           FROM "generate_series"(0, 2) "n"("n")
        )
 SELECT "bulan_target"."urutan",
    "to_char"(("bulan_target"."awal_bulan")::timestamp with time zone, 'YYYY-MM'::"text") AS "bulan_label",
    ("count"("interns"."id"))::integer AS "jumlah_terisi",
    20 AS "kuota_maksimal"
   FROM ("bulan_target"
     LEFT JOIN "public"."interns" ON ((("interns"."status_magang" <> 'Dropped'::"public"."status_magang") AND ("interns"."tanggal_mulai" <= (("bulan_target"."awal_bulan" + '1 mon'::interval) - '1 day'::interval)) AND ("interns"."tanggal_selesai" > "bulan_target"."awal_bulan"))))
  GROUP BY "bulan_target"."urutan", "bulan_target"."awal_bulan"
  ORDER BY "bulan_target"."urutan";


ALTER VIEW "public"."quota_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rubric_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "mentor_id" "uuid" NOT NULL,
    "periode" "text" NOT NULL,
    "nilai_soft_skill" numeric(5,2) NOT NULL,
    "nilai_hard_skill" numeric(5,2) NOT NULL,
    "catatan_mentor" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nilai_sikap" numeric(5,2),
    "nilai_kedisiplinan" numeric(5,2),
    "nilai_komunikasi" numeric(5,2),
    "nilai_project" numeric(5,2),
    "nilai_inisiatif" numeric(2,1),
    "nilai_pemecahan" numeric(2,1),
    "nilai_teknis" numeric(2,1),
    "nilai_kualitas" numeric(2,1),
    "nilai_disiplin" numeric(2,1),
    CONSTRAINT "rubric_scores_nilai_disiplin_check" CHECK ((("nilai_disiplin" >= (3)::numeric) AND ("nilai_disiplin" <= (5)::numeric))),
    CONSTRAINT "rubric_scores_nilai_hard_skill_check" CHECK ((("nilai_hard_skill" >= (0)::numeric) AND ("nilai_hard_skill" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_inisiatif_check" CHECK ((("nilai_inisiatif" >= (3)::numeric) AND ("nilai_inisiatif" <= (5)::numeric))),
    CONSTRAINT "rubric_scores_nilai_kedisiplinan_check" CHECK ((("nilai_kedisiplinan" >= (0)::numeric) AND ("nilai_kedisiplinan" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_komunikasi_check" CHECK ((("nilai_komunikasi" >= (0)::numeric) AND ("nilai_komunikasi" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_kualitas_check" CHECK ((("nilai_kualitas" >= (3)::numeric) AND ("nilai_kualitas" <= (5)::numeric))),
    CONSTRAINT "rubric_scores_nilai_pemecahan_check" CHECK ((("nilai_pemecahan" >= (3)::numeric) AND ("nilai_pemecahan" <= (5)::numeric))),
    CONSTRAINT "rubric_scores_nilai_project_check" CHECK ((("nilai_project" >= (0)::numeric) AND ("nilai_project" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_sikap_check" CHECK ((("nilai_sikap" >= (0)::numeric) AND ("nilai_sikap" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_soft_skill_check" CHECK ((("nilai_soft_skill" >= (0)::numeric) AND ("nilai_soft_skill" <= (100)::numeric))),
    CONSTRAINT "rubric_scores_nilai_teknis_check" CHECK ((("nilai_teknis" >= (3)::numeric) AND ("nilai_teknis" <= (5)::numeric))),
    CONSTRAINT "rubric_scores_periode_check" CHECK (("periode" ~ '^\d{4}-(0[1-9]|1[0-2])$'::"text"))
);


ALTER TABLE "public"."rubric_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subtasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "intern_id" "uuid" NOT NULL,
    "judul" "text" NOT NULL,
    "deskripsi" "text",
    "deadline" "date",
    "status" "public"."status_subtugas" DEFAULT 'Belum'::"public"."status_subtugas" NOT NULL,
    "selesai_at" timestamp with time zone,
    "urutan" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_bukti" "text",
    "catatan_pengumpulan" "text",
    "catatan_revisi" "text",
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "nilai" "public"."nilai_huruf",
    "assignment_group" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bobot" numeric(5,2) DEFAULT NULL::numeric,
    CONSTRAINT "subtasks_bobot_check" CHECK ((("bobot" IS NULL) OR (("bobot" > (0)::numeric) AND ("bobot" <= (100)::numeric))))
);


ALTER TABLE "public"."subtasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_intern_id_tanggal_presensi_key" UNIQUE ("intern_id", "tanggal_presensi");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_intern_id_key" UNIQUE ("intern_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."division_quotas"
    ADD CONSTRAINT "division_quotas_bulan_divisi_key" UNIQUE ("bulan", "divisi");



ALTER TABLE ONLY "public"."division_quotas"
    ADD CONSTRAINT "division_quotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."early_checkouts"
    ADD CONSTRAINT "early_checkouts_intern_id_tanggal_key" UNIQUE ("intern_id", "tanggal");



ALTER TABLE ONLY "public"."early_checkouts"
    ADD CONSTRAINT "early_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_nama_kelompok_key" UNIQUE ("nama_kelompok");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_application_id_key" UNIQUE ("application_id");



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kantor"
    ADD CONSTRAINT "kantor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook"
    ADD CONSTRAINT "logbook_intern_id_tanggal_key" UNIQUE ("intern_id", "tanggal");



ALTER TABLE ONLY "public"."logbook"
    ADD CONSTRAINT "logbook_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentoring_schedules"
    ADD CONSTRAINT "mentoring_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_history"
    ADD CONSTRAINT "password_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_grades"
    ADD CONSTRAINT "project_grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_grades"
    ADD CONSTRAINT "project_grades_project_id_intern_id_key" UNIQUE ("project_id", "intern_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rubric_scores"
    ADD CONSTRAINT "rubric_scores_intern_id_periode_key" UNIQUE ("intern_id", "periode");



ALTER TABLE ONLY "public"."rubric_scores"
    ADD CONSTRAINT "rubric_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_applications_created" ON "public"."applications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_applications_status" ON "public"."applications" USING "btree" ("status_pendaftaran");



CREATE INDEX "idx_applications_tanggal_mulai" ON "public"."applications" USING "btree" ("tanggal_mulai");



CREATE INDEX "idx_attendance_tanggal" ON "public"."attendance" USING "btree" ("tanggal_presensi");



CREATE INDEX "idx_groups_mentor" ON "public"."groups" USING "btree" ("mentor_id");



CREATE INDEX "idx_interns_group" ON "public"."interns" USING "btree" ("group_id");



CREATE INDEX "idx_interns_status" ON "public"."interns" USING "btree" ("status_magang");



CREATE INDEX "idx_interns_tanggal_mulai" ON "public"."interns" USING "btree" ("tanggal_mulai");



CREATE INDEX "idx_leaves_intern" ON "public"."leave_requests" USING "btree" ("intern_id");



CREATE INDEX "idx_leaves_range" ON "public"."leave_requests" USING "btree" ("tanggal_mulai", "tanggal_selesai");



CREATE INDEX "idx_leaves_status" ON "public"."leave_requests" USING "btree" ("status_izin");



CREATE INDEX "idx_logbook_intern" ON "public"."logbook" USING "btree" ("intern_id", "tanggal" DESC);



CREATE INDEX "idx_mentoring_group_time" ON "public"."mentoring_schedules" USING "btree" ("group_id", "tanggal_waktu");



CREATE INDEX "idx_notif_status" ON "public"."notifications" USING "btree" ("status_kirim");



CREATE INDEX "idx_notif_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_pgrades_intern" ON "public"."project_grades" USING "btree" ("intern_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_projects_group" ON "public"."projects" USING "btree" ("group_id");



CREATE INDEX "idx_rubric_intern" ON "public"."rubric_scores" USING "btree" ("intern_id");



CREATE INDEX "idx_subtasks_group" ON "public"."subtasks" USING "btree" ("assignment_group");



CREATE INDEX "idx_subtasks_intern" ON "public"."subtasks" USING "btree" ("intern_id");



CREATE INDEX "idx_subtasks_project" ON "public"."subtasks" USING "btree" ("project_id");



CREATE INDEX "idx_tasks_in_review" ON "public"."kanban_tasks" USING "btree" ("intern_id") WHERE ("status_tugas" = 'In Review'::"public"."status_kanban");



CREATE INDEX "idx_tasks_intern_status" ON "public"."kanban_tasks" USING "btree" ("intern_id", "status_tugas");



CREATE INDEX "idx_tasks_project" ON "public"."kanban_tasks" USING "btree" ("project_id");



CREATE UNIQUE INDEX "uq_applications_email_aktif" ON "public"."applications" USING "btree" ("email") WHERE ("status_pendaftaran" <> 'Rejected'::"public"."status_pendaftaran");



CREATE OR REPLACE TRIGGER "trg_apply_approved_leave" AFTER UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."apply_approved_leave"();



CREATE OR REPLACE TRIGGER "trg_enforce_quota" BEFORE INSERT OR UPDATE OF "tanggal_mulai", "durasi_magang" ON "public"."interns" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_quota_on_intern_change"();



CREATE OR REPLACE TRIGGER "trg_notif_approve" AFTER UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."notif_approve"();



CREATE OR REPLACE TRIGGER "trg_notif_izin" AFTER INSERT OR UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notif_izin"();



CREATE OR REPLACE TRIGGER "trg_notif_kelompok" AFTER UPDATE ON "public"."interns" FOR EACH ROW EXECUTE FUNCTION "public"."notif_kelompok"();



CREATE OR REPLACE TRIGGER "trg_notif_mentoring" AFTER INSERT ON "public"."mentoring_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."notif_mentoring_baru"();



CREATE OR REPLACE TRIGGER "trg_notif_pengajuan" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."notif_pengajuan_baru"();



CREATE OR REPLACE TRIGGER "trg_notif_pulang_awal" AFTER INSERT OR UPDATE ON "public"."early_checkouts" FOR EACH ROW EXECUTE FUNCTION "public"."notif_pulang_awal"();



CREATE OR REPLACE TRIGGER "trg_notif_selesai" AFTER UPDATE ON "public"."interns" FOR EACH ROW EXECUTE FUNCTION "public"."notif_selesai_magang"();



CREATE OR REPLACE TRIGGER "trg_notif_subtugas_baru" AFTER INSERT ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."notif_subtugas_baru"();



CREATE OR REPLACE TRIGGER "trg_notif_subtugas_update" AFTER UPDATE ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."notif_subtugas_update"();



CREATE OR REPLACE TRIGGER "trg_notif_wa" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."notif_wa_berubah"();



CREATE OR REPLACE TRIGGER "trg_protect_profile" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_role"();



CREATE OR REPLACE TRIGGER "trg_set_tanggal_selesai" BEFORE INSERT OR UPDATE ON "public"."interns" FOR EACH ROW EXECUTE FUNCTION "public"."set_tanggal_selesai"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."interns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."kanban_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."mentoring_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."rubric_scores" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subtasks_nilai" AFTER DELETE OR UPDATE ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_subtasks_nilai"();



CREATE OR REPLACE TRIGGER "trg_sync_nomor_wa" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_nomor_wa"();



CREATE OR REPLACE TRIGGER "trg_sync_rubrik" BEFORE INSERT OR UPDATE ON "public"."rubric_scores" FOR EACH ROW EXECUTE FUNCTION "public"."sync_rubrik_soft_hard"();



CREATE OR REPLACE TRIGGER "trg_validasi_izin" BEFORE INSERT ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."validasi_izin_tanggal"();



CREATE OR REPLACE TRIGGER "trg_validasi_presensi" BEFORE INSERT OR UPDATE ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."validasi_presensi"();



CREATE OR REPLACE TRIGGER "trg_validasi_subtugas" BEFORE UPDATE ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."validasi_subtugas"();



CREATE OR REPLACE TRIGGER "trg_validasi_subtugas_ins" BEFORE INSERT ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."validasi_subtugas_insert"();



ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."division_quotas"
    ADD CONSTRAINT "division_quotas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."early_checkouts"
    ADD CONSTRAINT "early_checkouts_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."early_checkouts"
    ADD CONSTRAINT "early_checkouts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interns"
    ADD CONSTRAINT "interns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logbook"
    ADD CONSTRAINT "logbook_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentoring_schedules"
    ADD CONSTRAINT "mentoring_schedules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentoring_schedules"
    ADD CONSTRAINT "mentoring_schedules_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_history"
    ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_grades"
    ADD CONSTRAINT "project_grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_grades"
    ADD CONSTRAINT "project_grades_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_grades"
    ADD CONSTRAINT "project_grades_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rubric_scores"
    ADD CONSTRAINT "rubric_scores_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rubric_scores"
    ADD CONSTRAINT "rubric_scores_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_intern_id_fkey" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE "public"."account_suspensions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_admin_all" ON "public"."applications" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "applications_insert_public" ON "public"."applications" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("status_pendaftaran" = 'Pending'::"public"."status_pendaftaran") AND (("durasi_magang" >= 1) AND ("durasi_magang" <= 26))));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_admin_all" ON "public"."attendance" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "attendance_insert_self_today" ON "public"."attendance" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_own_intern"("intern_id") AND ("tanggal_presensi" = CURRENT_DATE) AND ("status_kehadiran" = 'Hadir'::"public"."status_kehadiran")));



CREATE POLICY "attendance_select_scoped" ON "public"."attendance" FOR SELECT TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "attendance_update_self" ON "public"."attendance" FOR UPDATE TO "authenticated" USING ("public"."is_own_intern"("intern_id")) WITH CHECK ("public"."is_own_intern"("intern_id"));



CREATE POLICY "cert_admin_all" ON "public"."certificates" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "cert_select_mentor" ON "public"."certificates" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "cert_select_own" ON "public"."certificates" FOR SELECT TO "authenticated" USING ("public"."is_own_intern"("intern_id"));



ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."division_quotas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dq_admin_all" ON "public"."division_quotas" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "dq_select_all" ON "public"."division_quotas" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."early_checkouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ec_admin_all" ON "public"."early_checkouts" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ec_insert_own" ON "public"."early_checkouts" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_own_intern"("intern_id") AND ("status" = 'Pending'::"public"."status_izin")));



CREATE POLICY "ec_select_mentor" ON "public"."early_checkouts" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "ec_select_own" ON "public"."early_checkouts" FOR SELECT TO "authenticated" USING ("public"."is_own_intern"("intern_id"));



ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_admin_all" ON "public"."groups" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "groups_select_mentor_member" ON "public"."groups" FOR SELECT TO "authenticated" USING ((("mentor_id" = "auth"."uid"()) OR "public"."is_group_member"("id")));



ALTER TABLE "public"."interns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interns_admin_all" ON "public"."interns" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "interns_select_scoped" ON "public"."interns" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_my_mentee"("id") OR "public"."is_teammate"("id")));



CREATE POLICY "kanban_admin_all" ON "public"."kanban_tasks" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "kanban_delete_mentor" ON "public"."kanban_tasks" FOR DELETE TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "kanban_insert_mentor" ON "public"."kanban_tasks" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "kanban_select_scoped" ON "public"."kanban_tasks" FOR SELECT TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



ALTER TABLE "public"."kanban_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_update_intern_mentor" ON "public"."kanban_tasks" FOR UPDATE TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id"))) WITH CHECK (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



ALTER TABLE "public"."kantor" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kantor_admin_update" ON "public"."kantor" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "kantor_select" ON "public"."kantor" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leaves_admin_all" ON "public"."leave_requests" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "leaves_insert_self" ON "public"."leave_requests" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_own_intern"("intern_id") AND ("status_izin" = 'Pending'::"public"."status_izin")));



CREATE POLICY "leaves_select_scoped" ON "public"."leave_requests" FOR SELECT TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "leaves_update_admin" ON "public"."leave_requests" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."logbook" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "logbook_owner_all" ON "public"."logbook" TO "authenticated" USING ("public"."is_own_intern"("intern_id")) WITH CHECK ("public"."is_own_intern"("intern_id"));



CREATE POLICY "logbook_select_admin" ON "public"."logbook" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "logbook_select_mentor" ON "public"."logbook" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "mentoring_admin_all" ON "public"."mentoring_schedules" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "mentoring_delete_mentor" ON "public"."mentoring_schedules" FOR DELETE TO "authenticated" USING ("public"."is_group_mentor"("group_id"));



CREATE POLICY "mentoring_insert_mentor" ON "public"."mentoring_schedules" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_group_mentor"("group_id"));



ALTER TABLE "public"."mentoring_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mentoring_select_scoped" ON "public"."mentoring_schedules" FOR SELECT TO "authenticated" USING (("public"."is_group_mentor"("group_id") OR "public"."is_group_member"("group_id")));



CREATE POLICY "mentoring_update_mentor" ON "public"."mentoring_schedules" FOR UPDATE TO "authenticated" USING ("public"."is_group_mentor"("group_id")) WITH CHECK ("public"."is_group_mentor"("group_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_admin_all" ON "public"."notifications" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."password_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pgrades_admin_all" ON "public"."project_grades" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "pgrades_select_mentor" ON "public"."project_grades" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "pgrades_select_own" ON "public"."project_grades" FOR SELECT TO "authenticated" USING ("public"."is_own_intern"("intern_id"));



CREATE POLICY "pgrades_update_mentor" ON "public"."project_grades" FOR UPDATE TO "authenticated" USING ("public"."is_my_mentee"("intern_id")) WITH CHECK ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "pgrades_write_mentor" ON "public"."project_grades" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_my_mentee"("intern_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."project_grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_admin_all" ON "public"."projects" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "projects_select_scoped" ON "public"."projects" FOR SELECT TO "authenticated" USING (("public"."is_group_mentor"("group_id") OR "public"."is_group_member"("group_id")));



CREATE POLICY "projects_update_mentor" ON "public"."projects" FOR UPDATE TO "authenticated" USING ("public"."is_group_mentor"("group_id")) WITH CHECK ("public"."is_group_mentor"("group_id"));



CREATE POLICY "projects_write_mentor" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_group_mentor"("group_id"));



CREATE POLICY "pwdhist_owner" ON "public"."password_history" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rubric_admin_all" ON "public"."rubric_scores" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "rubric_insert_mentor" ON "public"."rubric_scores" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_my_mentee"("intern_id"));



ALTER TABLE "public"."rubric_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rubric_select_scoped" ON "public"."rubric_scores" FOR SELECT TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "rubric_update_mentor" ON "public"."rubric_scores" FOR UPDATE TO "authenticated" USING ("public"."is_my_mentee"("intern_id")) WITH CHECK ("public"."is_my_mentee"("intern_id"));



ALTER TABLE "public"."subtasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subtasks_admin_all" ON "public"."subtasks" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "subtasks_delete_mentor_admin" ON "public"."subtasks" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "subtasks_insert_mentor_admin" ON "public"."subtasks" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "subtasks_select_mentor" ON "public"."subtasks" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "subtasks_select_own" ON "public"."subtasks" FOR SELECT TO "authenticated" USING ("public"."is_own_intern"("intern_id"));



CREATE POLICY "subtasks_update_own_mentor" ON "public"."subtasks" FOR UPDATE TO "authenticated" USING (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id"))) WITH CHECK (("public"."is_own_intern"("intern_id") OR "public"."is_my_mentee"("intern_id")));



CREATE POLICY "susp_admin_all" ON "public"."account_suspensions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "susp_select_mentor" ON "public"."account_suspensions" FOR SELECT TO "authenticated" USING ("public"."is_my_mentee"("intern_id"));



CREATE POLICY "susp_select_own" ON "public"."account_suspensions" FOR SELECT TO "authenticated" USING ("public"."is_own_intern"("intern_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_approved_leave"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_approved_leave"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_approved_leave"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_task_to_group"("p_project_id" "uuid", "p_judul" "text", "p_deskripsi" "text", "p_deadline" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_task_to_group"("p_project_id" "uuid", "p_judul" "text", "p_deskripsi" "text", "p_deadline" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_task_to_group"("p_project_id" "uuid", "p_judul" "text", "p_deskripsi" "text", "p_deadline" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."buat_notifikasi"("p_user_id" "uuid", "p_judul" "text", "p_pesan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."buat_notifikasi"("p_user_id" "uuid", "p_judul" "text", "p_pesan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buat_notifikasi"("p_user_id" "uuid", "p_judul" "text", "p_pesan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_quota"("p_tanggal_mulai" "date", "p_durasi" integer, "p_satuan" "text", "p_selesai_custom" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."check_quota"("p_tanggal_mulai" "date", "p_durasi" integer, "p_satuan" "text", "p_selesai_custom" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_quota"("p_tanggal_mulai" "date", "p_durasi" integer, "p_satuan" "text", "p_selesai_custom" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_quota_on_intern_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_quota_on_intern_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_quota_on_intern_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_attendance_stats"("p_intern_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_attendance_stats"("p_intern_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attendance_stats"("p_intern_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auto_penilaian"("p_intern_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_auto_penilaian"("p_intern_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auto_penilaian"("p_intern_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_mentor"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_mentor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_mentor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_directory"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_directory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_directory"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quota_usage"("p_mulai" "date", "p_jumlah_bulan" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_quota_usage"("p_mulai" "date", "p_jumlah_bulan" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quota_usage"("p_mulai" "date", "p_jumlah_bulan" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."huruf_ke_skala"("p" "public"."nilai_huruf") TO "anon";
GRANT ALL ON FUNCTION "public"."huruf_ke_skala"("p" "public"."nilai_huruf") TO "authenticated";
GRANT ALL ON FUNCTION "public"."huruf_ke_skala"("p" "public"."nilai_huruf") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_reminder_notifikasi"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_reminder_notifikasi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_reminder_notifikasi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_mentor"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_mentor"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_mentor"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_mentor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_mentor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_mentor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_my_mentee"("p_intern_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_my_mentee"("p_intern_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_my_mentee"("p_intern_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_own_intern"("p_intern_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_own_intern"("p_intern_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_own_intern"("p_intern_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teammate"("p_intern_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_teammate"("p_intern_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teammate"("p_intern_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_alpha_yesterday"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_alpha_yesterday"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_alpha_yesterday"() TO "service_role";



GRANT ALL ON FUNCTION "public"."max_durasi"("p_satuan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."max_durasi"("p_satuan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max_durasi"("p_satuan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_admin"("p_judul" "text", "p_pesan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."notif_admin"("p_judul" "text", "p_pesan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_admin"("p_judul" "text", "p_pesan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_approve"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_approve"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_approve"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_izin"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_izin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_izin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_kelompok"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_kelompok"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_kelompok"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_mentoring_baru"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_mentoring_baru"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_mentoring_baru"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_pengajuan_baru"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_pengajuan_baru"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_pengajuan_baru"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_pulang_awal"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_pulang_awal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_pulang_awal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_selesai_magang"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_selesai_magang"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_selesai_magang"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_subtugas_baru"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_subtugas_baru"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_subtugas_baru"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_subtugas_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_subtugas_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_subtugas_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_wa_berubah"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_wa_berubah"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_wa_berubah"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_project_grade"("p_intern" "uuid", "p_project" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_project_grade"("p_intern" "uuid", "p_project" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_project_grade"("p_intern" "uuid", "p_project" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_project_grade_weighted"("p_intern" "uuid", "p_project" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_project_grade_weighted"("p_intern" "uuid", "p_project" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_project_grade_weighted"("p_intern" "uuid", "p_project" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tanggal_selesai"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_tanggal_selesai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tanggal_selesai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_nomor_wa"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_nomor_wa"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_nomor_wa"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_rubrik_soft_hard"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_rubrik_soft_hard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_rubrik_soft_hard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_subtasks_nilai"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_subtasks_nilai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_subtasks_nilai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validasi_izin_tanggal"() TO "anon";
GRANT ALL ON FUNCTION "public"."validasi_izin_tanggal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validasi_izin_tanggal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validasi_presensi"() TO "anon";
GRANT ALL ON FUNCTION "public"."validasi_presensi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validasi_presensi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validasi_subtugas"() TO "anon";
GRANT ALL ON FUNCTION "public"."validasi_subtugas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validasi_subtugas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validasi_subtugas_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."validasi_subtugas_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validasi_subtugas_insert"() TO "service_role";



GRANT ALL ON TABLE "public"."account_suspensions" TO "anon";
GRANT ALL ON TABLE "public"."account_suspensions" TO "authenticated";
GRANT ALL ON TABLE "public"."account_suspensions" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";
GRANT ALL ON TABLE "public"."applications" TO "anon";



GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."division_quotas" TO "anon";
GRANT ALL ON TABLE "public"."division_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."division_quotas" TO "service_role";



GRANT ALL ON TABLE "public"."early_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."early_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."early_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."interns" TO "authenticated";
GRANT ALL ON TABLE "public"."interns" TO "service_role";
GRANT ALL ON TABLE "public"."interns" TO "anon";



GRANT ALL ON TABLE "public"."kanban_tasks" TO "anon";
GRANT ALL ON TABLE "public"."kanban_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."kantor" TO "anon";
GRANT ALL ON TABLE "public"."kantor" TO "authenticated";
GRANT ALL ON TABLE "public"."kantor" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."logbook" TO "anon";
GRANT ALL ON TABLE "public"."logbook" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook" TO "service_role";



GRANT ALL ON TABLE "public"."mentoring_schedules" TO "anon";
GRANT ALL ON TABLE "public"."mentoring_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."mentoring_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."password_history" TO "anon";
GRANT ALL ON TABLE "public"."password_history" TO "authenticated";
GRANT ALL ON TABLE "public"."password_history" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_grades" TO "anon";
GRANT ALL ON TABLE "public"."project_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."project_grades" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quota_overview" TO "anon";
GRANT ALL ON TABLE "public"."quota_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."quota_overview" TO "service_role";



GRANT ALL ON TABLE "public"."rubric_scores" TO "anon";
GRANT ALL ON TABLE "public"."rubric_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."rubric_scores" TO "service_role";



GRANT ALL ON TABLE "public"."subtasks" TO "anon";
GRANT ALL ON TABLE "public"."subtasks" TO "authenticated";
GRANT ALL ON TABLE "public"."subtasks" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







