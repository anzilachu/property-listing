import { z } from "https://esm.sh/zod@3.23.8";
import { bitrixCall } from "../_shared/bitrix.ts";
import { handleOptions, json } from "../_shared/cors.ts";
import { decryptSecret } from "../_shared/crypto.ts";
import { requireAdmin } from "../_shared/supabase.ts";
import { assertClientId } from "../_shared/validation.ts";

const schema = z.object({ clientId: z.string() });

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const input = schema.parse(await request.json());
    assertClientId(input.clientId);
    const { client } = await requireAdmin(request);
    const { data, error } = await client.from("integration_settings").select("bitrix").eq("client_id", input.clientId).single();
    if (error || !data) throw new Error("Client settings not found.");
    const encrypted = data.bitrix.webhookEncrypted;
    if (!encrypted) throw new Error("Bitrix webhook is not connected.");
    const webhookUrl = await decryptSecret(encrypted);
    const [fields, users] = await Promise.all([
      bitrixCall(webhookUrl, "crm.item.fields", { entityTypeId: data.bitrix.entityTypeId ?? 1052 }),
      bitrixCall(webhookUrl, "user.get", {}),
    ]);
    return json({ ok: true, fieldsCount: Object.keys(fields as Record<string, unknown>).length, usersCount: Array.isArray(users) ? users.length : 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
