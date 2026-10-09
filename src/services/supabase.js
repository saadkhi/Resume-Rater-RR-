import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://medvnbynodmsjaqvtjzl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_sZf5iUHaHsorwnonRdoC0g_gtthy4-f';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchTodos() {
  try {
    const { data, error } = await supabase.from('todos').select('*');
    if (error) {
      console.warn('[Supabase] fetchTodos notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[Supabase] error:', err.message);
    return [];
  }
}

export default supabase;
