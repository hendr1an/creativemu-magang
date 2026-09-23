-- =====================================================
-- 006: Presensi v2 — lokasi kantor + geofencing + jadwal
-- =====================================================

-- 1. Tabel lokasi kantor (1 baris, bisa diubah admin)
create table if not exists public.kantor (
  id           int primary key default 1 check (id = 1),
  nama         text not null default 'Kantor Creativemu Academy',
  latitude     numeric(9,6) not null,
  longitude    numeric(9,6) not null,
  radius_meter int not null default 100
);

-- ⚠️ SEED dengan koordinat SEMENTARA — ganti dengan koordinat asli kantor
--    (cara: buka Google Maps → tap-tahan tepat di lokasi kantor →
--     koordinat muncul di kotak pencarian → copy)
insert into public.kantor (latitude, longitude, radius_meter)
values (-6.200000, 106.816666, 100)
on conflict (id) do update set radius_meter = excluded.radius_meter;

-- 2. Kolom koordinat presensi (jejak audit GPS)
alter table public.attendance
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists checkout_latitude numeric(9,6),
  add column if not exists checkout_longitude numeric(9,6);

-- 3. RLS: semua yang login boleh BACA (dipakai validasi frontend),
--    hanya admin boleh UBAH lokasi kantor
alter table public.kantor enable row level security;

drop policy if exists "kantor_select" on public.kantor;
create policy "kantor_select" on public.kantor
  for select to authenticated using (true);

drop policy if exists "kantor_admin_update" on public.kantor;
create policy "kantor_admin_update" on public.kantor
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4. Trigger validasi: geofencing (Haversine) + jadwal 08:00 / 17:00
--    Hanya berlaku untuk presensi dari INTERN (cron Alpha & trigger izin
--    berjalan sebagai postgres/service → auth.uid() NULL → dilewati)
create or replace function public.validasi_presensi()
returns trigger
language plpgsql security definer set search_path = public as $$ declare
  v_lat numeric; v_lng numeric; v_radius int;
  v_jarak double precision;
begin
  if auth.uid() is not null then
    select latitude, longitude, radius_meter
      into v_lat, v_lng, v_radius
      from public.kantor where id = 1;

    ---------- CHECK-IN (INSERT) ----------
    if tg_op = 'INSERT' and new.check_in is not null
       and new.status_kehadiran = 'Hadir' then

      if new.latitude is null or new.longitude is null then
        raise exception 'Presensi gagal: lokasi GPS wajib diaktifkan.';
      end if;

      v_jarak := 6371000 * 2 * asin(sqrt(
        power(sin(radians(new.latitude - v_lat) / 2), 2) +
        cos(radians(v_lat)) * cos(radians(new.latitude)) *
        power(sin(radians(new.longitude - v_lng) / 2), 2)
      ));
      if v_jarak > v_radius then
        raise exception 'Presensi gagal: kamu ±% meter dari kantor (maksimal % m).',
          round(v_jarak::numeric), v_radius;
      end if;

      if (new.check_in at time zone 'Asia/Jakarta')::time < '08:00' then
        raise exception 'Presensi gagal: check-in baru dibuka pukul 08:00 WIB.';
      end if;
    end if;

    ---------- CHECK-OUT (UPDATE) ----------
    if tg_op = 'UPDATE' and new.check_out is not null
       and old.check_out is null then

      if new.checkout_latitude is null or new.checkout_longitude is null then
        raise exception 'Check-out gagal: lokasi GPS wajib diaktifkan.';
      end if;

      v_jarak := 6371000 * 2 * asin(sqrt(
        power(sin(radians(new.checkout_latitude - v_lat) / 2), 2) +
        cos(radians(v_lat)) * cos(radians(new.checkout_latitude)) *
        power(sin(radians(new.checkout_longitude - v_lng) / 2), 2)
      ));
      if v_jarak > v_radius then
        raise exception 'Check-out gagal: kamu ±% meter dari kantor (maksimal % m).',
          round(v_jarak::numeric), v_radius;
      end if;

      if (new.check_out at time zone 'Asia/Jakarta')::time < '17:00' then
        raise exception 'Check-out gagal: check-out baru dibuka pukul 17:00 WIB.';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_validasi_presensi on public.attendance;
create trigger trg_validasi_presensi
  before insert or update on public.attendance
  for each row execute function public.validasi_presensi();