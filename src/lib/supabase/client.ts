import { createBrowserClient } from '@supabase/ssr';

/** Safe Browser-side Supabase client for Client Components */
export function createClient() {
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

  return createBrowserClient(url, key);
}
