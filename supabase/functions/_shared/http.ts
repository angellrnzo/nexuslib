import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export function options(): Response {
  return new Response('ok', { headers: CORS });
}

export interface AuthCtx {
  userId: string;
  // cliente con service role: escribe saltándose RLS tras verificar el JWT
  admin: SupabaseClient;
  // cliente con el JWT del usuario: para RPCs que usan auth.uid() (p.ej. get_item_merged)
  user: SupabaseClient;
}

// Verifica el JWT del usuario (Authorization: Bearer <token> lo inyecta
// supabase-js functions.invoke automáticamente) y devuelve contexto admin.
export async function requireUser(req: Request): Promise<AuthCtx | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return json({ error: 'invalid or expired token' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return { userId: user.id, admin, user: userClient };
}
