import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://medvnbynodmsjaqvtjzl.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_sZf5iUHaHsorwnonRdoC0g_gtthy4-f";

export const createClient = (request: any) => {
  // Create an unmodified response representation
  const cookiesToSetList: Array<{ name: string; value: string; options?: any }> = [];

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          if (request?.cookies?.getAll) {
            return request.cookies.getAll();
          }
          if (request?.cookies) {
            return Object.entries(request.cookies).map(([name, value]) => ({ name, value: String(value) }));
          }
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetList.push({ name, value, options });
            if (request?.cookies?.set) {
              request.cookies.set(name, value);
            }
          });
        },
      },
    },
  );

  return { supabase, cookiesToSetList };
};

export default createClient;
