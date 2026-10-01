import { bitrixCall, getWebhookUrl } from "../_shared/bitrix.ts";
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { verifyClientToken } from "../_shared/crypto.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientId } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") ?? "";
    const itemId = url.searchParams.get("item") ?? "";
    const fileId = url.searchParams.get("file") ?? "";
    const token = url.searchParams.get("t") ?? "";
    assertClientId(clientId);
    await verifyClientToken(token, clientId);
    const client = serviceClient();
    const { data: settings, error } = await client.from("integration_settings").select("*").eq("client_id", clientId).single();
    if (error || !settings) throw new Error("Client settings not found.");
    const webhookUrl = await getWebhookUrl(settings);
    const mapping = settings.field_mapping ?? {};
    if (!mapping.originalImages) throw new Error("Original images field is not mapped.");
    const result = await bitrixCall<{ items: Record<string, unknown>[] }>(webhookUrl, "crm.item.list", {
      entityTypeId: settings.bitrix.entityTypeId ?? 1052,
      filter: { id: itemId },
      select: ["id", mapping.originalImages],
    });
    const files = result.items?.[0]?.[mapping.originalImages] as Array<{ id?: string; ID?: string; urlMachine?: string }> | undefined;
    const file = files?.find((candidate) => String(candidate.id ?? candidate.ID) === fileId);
    if (!file?.urlMachine) return json({ error: "Image not found." }, { status: 404 });
    const upstream = await fetch(file.urlMachine);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
