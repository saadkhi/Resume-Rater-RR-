import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://medvnbynodmsjaqvtjzl.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_sZf5iUHaHsorwnonRdoC0g_gtthy4-f";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

export default createClient;
