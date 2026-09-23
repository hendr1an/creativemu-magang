import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export function useMentor() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: gs } = await supabase
        .from('groups').select('*').eq('mentor_id', user.id).order('created_at');
      const ids = (gs ?? []).map((g) => g.id);
      let ms = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('interns')
          .select('id, nama_lengkap, email, group_id, tanggal_mulai, durasi_magang, tanggal_selesai')
          .in('group_id', ids)
          .eq('status_magang', 'Active')
          .order('nama_lengkap');
        ms = data ?? [];
      }
      setGroups(gs ?? []);
      setMentees(ms);
      setLoading(false);
    })();
  }, [user]);

  return { groups, mentees, loading };
}