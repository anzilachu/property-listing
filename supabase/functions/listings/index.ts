import { bitrixCall, getWebhookUrl, pagedBitrixList } from "../_shared/bitrix.ts";
import { handleOptions, json } from "../_shared/cors.ts";
import { verifyClientToken } from "../_shared/crypto.ts";
import { autoMapFields, canonicalFields, normaliseListing } from "../_shared/normalizers.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientId } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") ?? "";
    const search = url.searchParams.get("search") ?? "";
    assertClientId(clientId);
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    await verifyClientToken(token, clientId);
    const client = serviceClient();
    const { data: settings, error } = await client.from("integration_settings").select("*").eq("client_id", clientId).single();
    if (error || !settings) throw new Error("Client settings not found.");
    const webhookUrl = await getWebhookUrl(settings);
    const entityTypeId = Number(settings.bitrix.entityTypeId ?? 1052);
    let mapping = settings.field_mapping ?? {};
    let dictionaries = settings.field_dictionaries ?? {};
    if (!Object.keys(mapping).length) {
      const fields = await bitrixCall<Record<string, { title?: string; items?: { ID: string; VALUE: string }[] }>>(webhookUrl, "crm.item.fields", { entityTypeId });
      const detected = autoMapFields(fields);
      mapping = detected.mapping;
      dictionaries = detected.dictionaries;
      await client.from("integration_settings").update({ field_mapping: mapping, field_dictionaries: dictionaries }).eq("client_id", clientId);
    }
    const missingMappings = canonicalFields.filter((field) => !mapping[field] && !["category", "priceType", "descriptionAr"].includes(field));
    if (missingMappings.length) return json({ rows: [], total: 0, missingMappings });
    const select = Array.from(new Set(["id", "title", "stageId", "categoryId", "createdTime", "updatedTime", "assignedById", ...Object.values(mapping)]));
    const filter = search ? { "%title": search } : {};
    const items = await pagedBitrixList<Record<string, unknown>>(webhookUrl, entityTypeId, {
      select,
      filter,
      order: { updatedTime: "DESC" },
    });
    const userIds = Array.from(new Set(items.map((item) => String(item.assignedById)).filter(Boolean)));
    const usersResult = userIds.length ? await bitrixCall<Record<string, unknown>[]>(webhookUrl, "user.get", { ID: userIds }) : [];
    const users = Object.fromEntries(usersResult.map((user) => [String(user.ID), { name: [user.NAME, user.LAST_NAME].filter(Boolean).join(" ") }]));
    const stageIds = Array.from(new Set(items.map((item) => String(item.stageId)).filter(Boolean)));
    const stageNames: Record<string, { name: string; semantics?: string }> = {};
    for (const categoryId of Array.from(new Set(items.map((item) => Number(item.categoryId)).filter(Boolean)))) {
      const statuses = await bitrixCall<Record<string, unknown>[]>(webhookUrl, "crm.status.list", { filter: { ENTITY_ID: `DYNAMIC_${entityTypeId}_STAGE_${categoryId}` } });
      for (const status of statuses) stageNames[String(status.STATUS_ID)] = { name: String(status.NAME), semantics: String(status.SEMANTICS ?? "") };
    }
    const imageUrl = (itemId: string, fileId: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/image?clientId=${clientId}&item=${itemId}&file=${fileId}&t=${token}`;
    const rows = items.map((item) => normaliseListing(item, mapping, dictionaries, stageNames, users, imageUrl));
    return json({ rows, total: rows.length, next: null, missingMappings: [] });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
