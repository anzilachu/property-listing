import { handleOptions, json } from "../_shared/cors.ts";
import { verifyClientToken } from "../_shared/crypto.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientId } from "../_shared/validation.ts";

type ClientSettingsInput = {
  accountName: string;
  companyName: string;
  logoUrl?: string | null;
  theme: "light" | "dark";
  accentColor: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseInput(value: unknown): ClientSettingsInput {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const body = value as Record<string, unknown>;
  const accountName = text(body.accountName);
  const companyName = text(body.companyName);
  const logoUrl = body.logoUrl === null ? null : text(body.logoUrl);
  const theme = body.theme === "dark" ? "dark" : "light";
  const accentColor = text(body.accentColor);

  if (!accountName) throw new Error("Account name is required.");
  if (!companyName) throw new Error("Company name is required.");
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) throw new Error("Accent color must be a hex color.");
  if (typeof logoUrl === "string" && logoUrl) {
    if (!/^data:image\/(png|jpe?g|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(logoUrl)) {
      throw new Error("Logo must be a PNG, JPG, WEBP, or SVG image.");
    }
    if (logoUrl.length > 700_000) throw new Error("Logo is too large. Use an image under 500 KB.");
  }

  return {
    accountName,
    companyName,
    logoUrl: logoUrl || null,
    theme,
    accentColor,
  };
}

function settingsFromRelation(value: unknown) {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return undefined;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (request.method !== "PATCH") return json({ error: "Method not allowed" }, { status: 405 });

    const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
    assertClientId(clientId);
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    await verifyClientToken(token, clientId);

    const input = parseInput(await request.json());
    const client = serviceClient();
    const { data: existingClient, error: existingError } = await client
      .from("clients")
      .select("*, integration_settings(*)")
      .eq("client_id", clientId)
      .single();
    if (existingError || !existingClient) throw existingError ?? new Error("Client not found.");

    const existingSettings = settingsFromRelation(existingClient.integration_settings) ?? {};
    const general = {
      ...(existingSettings.general && typeof existingSettings.general === "object" ? existingSettings.general : {}),
      accountName: input.accountName,
      theme: input.theme,
      accent: input.accentColor,
      logo: input.logoUrl,
    };

    const { data: updatedClient, error: clientError } = await client
      .from("clients")
      .update({ company_name: input.companyName })
      .eq("client_id", clientId)
      .select("client_id, public_slug, company_name, portal_host")
      .single();
    if (clientError) throw clientError;

    const { error: settingsError } = await client
      .from("integration_settings")
      .upsert({
        client_id: clientId,
        bitrix: existingSettings.bitrix ?? {},
        pf: existingSettings.pf ?? { accounts: [] },
        bayut: existingSettings.bayut ?? { accounts: [] },
        dubizzle: existingSettings.dubizzle ?? { accounts: [] },
        general,
        field_mapping: existingSettings.field_mapping ?? {},
        field_dictionaries: existingSettings.field_dictionaries ?? {},
      }, {
        onConflict: "client_id",
      });
    if (settingsError) throw settingsError;

    return json({
      clientId: updatedClient.client_id,
      publicSlug: updatedClient.public_slug ?? updatedClient.client_id,
      accountName: typeof general.accountName === "string" ? general.accountName : updatedClient.company_name,
      companyName: updatedClient.company_name,
      portalHost: updatedClient.portal_host,
      logoUrl: typeof general.logo === "string" ? general.logo : null,
      theme: general.theme === "dark" ? "dark" : "light",
      accentColor: typeof general.accent === "string" ? general.accent : "#0c8f65",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
