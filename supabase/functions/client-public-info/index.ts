import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientKey } from "../_shared/validation.ts";

function settingsFromRelation(value: unknown) {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return undefined;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const clientKey = new URL(request.url).searchParams.get("clientId") ?? "";
    assertClientKey(clientKey);
    const alternateClientKey = clientKey.includes("_")
      ? clientKey.replaceAll("_", "-")
      : clientKey.replaceAll("-", "_");
    const client = serviceClient();
    const { data: clientRow, error: clientError } = await client
      .from("clients")
      .select("client_id, public_slug, company_name, portal_host")
      .or(`client_id.eq.${clientKey},public_slug.eq.${clientKey},public_slug.eq.${alternateClientKey}`)
      .single();
    if (clientError || !clientRow) return json({ error: `Unknown client: ${clientKey}` }, { status: 404 });

    const { data: settingsRow } = await client
      .from("integration_settings")
      .select("general")
      .eq("client_id", clientRow.client_id)
      .maybeSingle();
    const settings = settingsFromRelation(settingsRow);
    const general = settings?.general && typeof settings.general === "object"
      ? settings.general as Record<string, unknown>
      : {};
    return json({
      clientId: clientRow.client_id,
      publicSlug: clientRow.public_slug ?? clientRow.client_id,
      companyName: clientRow.company_name,
      portalHost: clientRow.portal_host,
      logoUrl: typeof general.logo === "string" ? general.logo : null,
      theme: general.theme === "dark" ? "dark" : "light",
      accentColor: typeof general.accent === "string" ? general.accent : "#0c8f65",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
