import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase service configuration.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Admin session required.");
  const client = serviceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid admin session.");
  const { data: roleRow, error: roleError } = await client
    .from("user_roles")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError) throw roleError;
  if (!roleRow) throw new Error(`Admin role required for user ${data.user.id}.`);
  return { client, user: data.user };
}
