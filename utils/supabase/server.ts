import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://medvnbynodmsjaqvtjzl.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_sZf5iUHaHsorwnonRdoC0g_gtthy4-f";

export const createClient = (cookieStore: any) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          if (cookieStore && typeof cookieStore.getAll === 'function') {
            return cookieStore.getAll();
          }
          if (typeof cookieStore === 'object' && cookieStore !== null) {
            return Object.entries(cookieStore).map(([name, value]) => ({ name, value: String(value) }));
          }
          return [];
        },
        setAll(cookiesToSet) {
          try {
            if (cookieStore && typeof cookieStore.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            }
          } catch {
            // Server component or read-only store
          }
        },
      },
    },
  );
};

export default createClient;
