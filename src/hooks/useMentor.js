import {
  useEffect,
  useState,
} from 'react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  supabase,
} from '../lib/supabaseClient';


export function useMentor() {
  const {
    user,
  } =
    useAuth();


  const [
    groups,
    setGroups,
  ] =
    useState([]);


  const [
    mentees,
    setMentees,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {
    if (!user) {
      setGroups([]);
      setMentees([]);
      setLoading(false);

      return;
    }


    let aktif =
      true;


    async function muatMentor() {
      setLoading(
        true
      );


      /* =====================================================
         1. KELOMPOK YANG DIBINA MENTOR
      ===================================================== */

      const {
        data:
          gs,

        error:
          groupError,
      } =
        await supabase
          .from(
            'groups'
          )
          .select(
            '*'
          )
          .eq(
            'mentor_id',
            user.id
          )
          .order(
            'created_at'
          );


      if (!aktif) {
        return;
      }


      if (
        groupError
      ) {
        console.error(
          'Gagal memuat kelompok mentor:',
          groupError
        );


        setGroups(
          []
        );

        setMentees(
          []
        );

        setLoading(
          false
        );

        return;
      }


      const daftarGroup =
        gs ??
        [];


      const groupIds =
        daftarGroup.map(
          (
            group
          ) =>
            group.id
        );


      /* =====================================================
         2. PESERTA AKTIF DALAM KELOMPOK

         FASE 5-7E:
         - instansi
         - jurusan
         - divisi

         ikut dibawa ke halaman Mentoring.
      ===================================================== */

      let daftarMentee =
        [];


      if (
        groupIds.length >
        0
      ) {
        const {
          data:
            internRows,

          error:
            internError,
        } =
          await supabase
            .from(
              'interns'
            )
            .select(
              `
              id,
              nama_lengkap,
              email,

              instansi,
              jurusan,
              divisi,

              group_id,

              tanggal_mulai,
              durasi_magang,
              satuan_durasi,
              tanggal_selesai
              `
            )
            .in(
              'group_id',
              groupIds
            )
            .eq(
              'status_magang',
              'Active'
            )
            .order(
              'nama_lengkap'
            );


        if (
          internError
        ) {
          console.error(
            'Gagal memuat peserta mentor:',
            internError
          );
        } else {
          daftarMentee =
            internRows ??
            [];
        }
      }


      if (!aktif) {
        return;
      }


      setGroups(
        daftarGroup
      );


      setMentees(
        daftarMentee
      );


      setLoading(
        false
      );
    }


    muatMentor();


    return () => {
      aktif =
        false;
    };
  }, [
    user,
  ]);


  return {
    groups,
    mentees,
    loading,
  };
}