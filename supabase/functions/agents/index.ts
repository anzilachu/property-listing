import { bitrixCall, getWebhookUrl } from "../_shared/bitrix.ts";
import { handleOptions, json } from "../_shared/cors.ts";
import { verifyClientToken } from "../_shared/crypto.ts";
import { normalisePerson } from "../_shared/normalizers.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientId } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
    assertClientId(clientId);
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    await verifyClientToken(token, clientId);
    const client = serviceClient();
    const { data: settings, error } = await client.from("integration_settings").select("*").eq("client_id", clientId).single();
    if (error || !settings) throw new Error("Client settings not found.");
    const users = await bitrixCall<Record<string, unknown>[]>(await getWebhookUrl(settings), "user.get", {});
    return json(users.map((user) => normalisePerson(user)).filter((person) => person.isAgent));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
