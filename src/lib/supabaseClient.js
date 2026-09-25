import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,        // simpan session di localStorage
      autoRefreshToken: true,     // refresh token otomatis sebelum expired
      detectSessionInUrl: true,    // recover session dari URL callback
      storageKey: 'sb-creativemu-auth',  // key unik (hindari konflik)
    },
  },
);