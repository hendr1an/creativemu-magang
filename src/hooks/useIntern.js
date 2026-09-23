import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export function useIntern() {
  const { user } = useAuth();
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('interns').select('*').eq('user_id', user.id).single()
      .then(({ data }) => { setIntern(data); setLoading(false); });
  }, [user]);

  return { intern, loading };
}