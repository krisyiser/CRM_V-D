import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Safe Server-side Supabase client */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: 'local-admin',
              email: 'admin@vainilladescanso.com',
              user_metadata: { name: 'Recepción Vainilla' }
            }
          },
          error: null
        }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null })
      }
    } as any;
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
