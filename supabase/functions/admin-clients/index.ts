import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { encryptSecret } from "../_shared/crypto.ts";
import { requireAdmin } from "../_shared/supabase.ts";
import { assertClientId, validateWebhookUrl } from "../_shared/validation.ts";

type CreateClientInput = {
  companyName: string;
  bitrixWebhookUrl?: string;
};

type UpdateClientInput = {
  companyName?: string;
  general?: {
    theme?: "light" | "dark";
    accent?: string;
  };
  bitrix?: {
    entityTypeId?: number;
    webhookUrl?: string;
  };
  pfAccounts?: Array<{
    label?: string;
    clientId?: string;
    secret?: string;
  }>;
  bayutAccounts?: Array<{
    label?: string;
    apiKey?: string;
  }>;
};

function parseCreateClientInput(value: unknown): CreateClientInput {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const body = value as Record<string, unknown>;
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const bitrixWebhookUrl = typeof body.bitrixWebhookUrl === "string" ? body.bitrixWebhookUrl.trim() : "";
  if (!companyName) throw new Error("Company name is required.");
  if (bitrixWebhookUrl) new URL(bitrixWebhookUrl);
  return { companyName, bitrixWebhookUrl: bitrixWebhookUrl || undefined };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseUpdateClientInput(value: unknown): UpdateClientInput {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const body = value as Record<string, unknown>;
  const general = body.general && typeof body.general === "object" ? body.general as Record<string, unknown> : undefined;
  const bitrix = body.bitrix && typeof body.bitrix === "object" ? body.bitrix as Record<string, unknown> : undefined;
  const pfAccountsValue = Array.isArray(body.pfAccounts)
    ? body.pfAccounts
    : body.pfAccount && typeof body.pfAccount === "object"
      ? [body.pfAccount]
      : [];
  const bayutAccountsValue = Array.isArray(body.bayutAccounts)
    ? body.bayutAccounts
    : body.bayutAccount && typeof body.bayutAccount === "object"
      ? [body.bayutAccount]
      : [];

  return {
    companyName: text(body.companyName) || undefined,
    general: general ? {
      theme: general.theme === "dark" ? "dark" : "light",
      accent: text(general.accent) || undefined,
    } : undefined,
    bitrix: bitrix ? {
      entityTypeId: Number(bitrix.entityTypeId) || undefined,
      webhookUrl: text(bitrix.webhookUrl) || undefined,
    } : undefined,
    pfAccounts: pfAccountsValue
      .filter((account): account is Record<string, unknown> => Boolean(account && typeof account === "object"))
      .map((account) => ({
        label: text(account.label),
        clientId: text(account.clientId),
        secret: text(account.secret),
      }))
      .filter((account) => account.label || account.clientId || account.secret),
    bayutAccounts: bayutAccountsValue
      .filter((account): account is Record<string, unknown> => Boolean(account && typeof account === "object"))
      .map((account) => ({
        label: text(account.label),
        apiKey: text(account.apiKey),
      }))
      .filter((account) => account.label || account.apiKey),
  };
}

const reservedClientIds = new Set(["admin", "api", "login", "assets", "auth", "functions", "static"]);

function slugifyCompanyName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return "client";
  return slug.length === 1 ? `${slug}-agency` : slug;
}

async function createUniquePublicSlug(client: { from: (table: string) => any }, companyName: string) {
  const base = slugifyCompanyName(companyName);
  if (reservedClientIds.has(base)) throw new Error("Agency name generates a reserved URL slug. Please use a more specific company name.");
  const { data, error } = await client
    .from("clients")
    .select("client_id, public_slug");
  if (error) throw error;
  const existing = new Set(
    (data ?? [])
      .map((row: { client_id: string; public_slug?: string | null }) => row.public_slug ?? row.client_id)
      .filter((slug: string) => slug === base || slug.startsWith(`${base}-`)),
  );
  if (!existing.has(base)) return base;
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("Could not generate a unique client URL slug.");
}

async function createUniqueClientId(client: { from: (table: string) => any }, publicSlug: string) {
  const { data, error } = await client
    .from("clients")
    .select("client_id");
  if (error) throw error;
  const existing = new Set((data ?? []).map((row: { client_id: string }) => row.client_id));
  const internalBase = publicSlug.replace(/-/g, "_");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${internalBase}_${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("Could not generate a unique internal client ID.");
}

function appOrigin(request: Request) {
  const configured = Deno.env.get("APP_ORIGIN");
  if (configured) return configured.replace(/\/$/, "");
  const origin = request.headers.get("Origin");
  return origin ?? "";
}

function settingsFromRelation(value: unknown) {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return undefined;
}

function toSummary(row: Record<string, unknown>, origin: string) {
  const first = settingsFromRelation(row.integration_settings) ?? {};
  const bitrix = first.bitrix as Record<string, unknown> | undefined;
  const general = first.general as Record<string, unknown> | undefined;
  const pf = first.pf as { accounts?: unknown[] } | undefined;
  const bayut = first.bayut as { accounts?: unknown[] } | undefined;
  const dubizzle = first.dubizzle as { accounts?: unknown[] } | undefined;
  const pfAccounts = Array.isArray(pf?.accounts) ? pf.accounts as Array<Record<string, unknown>> : [];
  const bayutAccounts = Array.isArray(bayut?.accounts) ? bayut.accounts as Array<Record<string, unknown>> : [];
  return {
    clientId: row.client_id,
    publicSlug: typeof row.public_slug === "string" ? row.public_slug : row.client_id,
    companyName: row.company_name,
    portalHost: row.portal_host,
    createdAt: row.created_at,
    link: `${origin}/${typeof row.public_slug === "string" ? row.public_slug : row.client_id}`,
    general: {
      theme: general?.theme === "dark" ? "dark" : "light",
      accentColor: typeof general?.accent === "string" ? general.accent : "#0c8f65",
      logoUrl: typeof general?.logo === "string" ? general.logo : null,
    },
    bitrix: {
      entityTypeId: Number(bitrix?.entityTypeId) || 1052,
    },
    accounts: {
      pf: pfAccounts.map((account) => ({
        label: typeof account.label === "string" ? account.label : "",
        clientId: typeof account.clientId === "string" ? account.clientId : "",
      })),
      bayut: bayutAccounts.map((account) => ({
        label: typeof account.label === "string" ? account.label : "",
      })),
    },
    integrations: {
      bitrix: Boolean(bitrix?.webhookEncrypted),
      pfAccounts: pfAccounts.length,
      bayutAccounts: bayutAccounts.length,
      dubizzleAccounts: dubizzle?.accounts?.length ?? 0,
    },
  };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { client } = await requireAdmin(request);
    const origin = appOrigin(request);
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean);
    const pathClientId = path[path.length - 1] === "admin-clients" ? null : path[path.length - 1];
    const targetClientId = url.searchParams.get("clientId") ?? pathClientId;

    if (request.method === "GET") {
      const { data, error } = await client
        .from("clients")
        .select("*, integration_settings(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json((data ?? []).map((row) => toSummary(row, origin)));
    }

    if (request.method === "POST") {
      const input = parseCreateClientInput(await request.json());
      const publicSlug = await createUniquePublicSlug(client, input.companyName);
      const clientId = await createUniqueClientId(client, publicSlug);
      assertClientId(clientId);
      const webhook = input.bitrixWebhookUrl ? validateWebhookUrl(input.bitrixWebhookUrl) : null;
      const encrypted = webhook ? await encryptSecret(webhook.normalized) : null;
      const { data, error } = await client
        .from("clients")
        .insert({ client_id: clientId, public_slug: publicSlug, company_name: input.companyName, portal_host: webhook?.portalHost ?? "" })
        .select("*")
        .single();
      if (error) throw error;
      const { error: settingsError } = await client.from("integration_settings").insert({
        client_id: clientId,
        bitrix: {
          ...(encrypted ? { webhookEncrypted: encrypted } : {}),
          entityTypeId: 1052,
          ...(webhook ? { portalHost: webhook.portalHost } : {}),
        },
        general: { theme: "light", accent: "#0c8f65", logo: null },
      });
      if (settingsError) throw settingsError;
      return json(toSummary({ ...data, integration_settings: [{ bitrix: { webhookEncrypted: Boolean(encrypted), entityTypeId: 1052 }, general: { theme: "light", accent: "#0c8f65", logo: null }, pf: { accounts: [] }, bayut: { accounts: [] }, dubizzle: { accounts: [] } }] }, origin), { status: 201 });
    }

    if (request.method === "PATCH" && targetClientId) {
      assertClientId(targetClientId);
      const input = parseUpdateClientInput(await request.json());
      const { data: existingClient, error: existingError } = await client
        .from("clients")
        .select("*, integration_settings(*)")
        .eq("client_id", targetClientId)
        .single();
      if (existingError || !existingClient) throw existingError ?? new Error("Client not found.");

      const existingSettings = settingsFromRelation(existingClient.integration_settings) ?? {};
      const existingBitrix = existingSettings?.bitrix ?? {};
      let portalHost = existingClient.portal_host;
      let bitrix = {
        ...existingBitrix,
        entityTypeId: input.bitrix?.entityTypeId ?? existingBitrix.entityTypeId ?? 1052,
      };

      if (input.bitrix?.webhookUrl) {
        const webhook = validateWebhookUrl(input.bitrix.webhookUrl);
        portalHost = webhook.portalHost;
        bitrix = {
          ...bitrix,
          webhookEncrypted: await encryptSecret(webhook.normalized),
          portalHost: webhook.portalHost,
        };
      }

      const general = {
        ...(existingSettings?.general ?? {}),
        ...(input.general?.theme ? { theme: input.general.theme } : {}),
        ...(input.general?.accent ? { accent: input.general.accent } : {}),
      };

      const existingPfAccounts = Array.isArray(existingSettings?.pf?.accounts)
        ? existingSettings.pf.accounts as Array<Record<string, unknown>>
        : [];
      const existingBayutAccounts = Array.isArray(existingSettings?.bayut?.accounts)
        ? existingSettings.bayut.accounts as Array<Record<string, unknown>>
        : [];

      const pfAccounts = input.pfAccounts
        ? await Promise.all(input.pfAccounts.map(async (account) => {
          const existing = existingPfAccounts.find((candidate) =>
            candidate.label === account.label && candidate.clientId === account.clientId
          );
          return {
            label: account.label,
            clientId: account.clientId,
            secretEncrypted: account.secret
              ? await encryptSecret(account.secret)
              : existing?.secretEncrypted,
          };
        }))
        : existingPfAccounts;

      const bayutAccounts = input.bayutAccounts
        ? await Promise.all(input.bayutAccounts.map(async (account) => {
          const existing = existingBayutAccounts.find((candidate) => candidate.label === account.label);
          return {
            label: account.label,
            apiKeyEncrypted: account.apiKey
              ? await encryptSecret(account.apiKey)
              : existing?.apiKeyEncrypted,
          };
        }))
        : existingBayutAccounts;

      const { data: updatedClient, error: clientError } = await client
        .from("clients")
        .update({
          company_name: input.companyName ?? existingClient.company_name,
          portal_host: portalHost,
        })
        .eq("client_id", targetClientId)
        .select("*")
        .single();
      if (clientError) throw clientError;

      const { error: settingsError } = await client
        .from("integration_settings")
        .upsert({
          client_id: targetClientId,
          bitrix,
          general,
          pf: { accounts: pfAccounts },
          bayut: { accounts: bayutAccounts },
          dubizzle: existingSettings?.dubizzle ?? { accounts: [] },
        }, {
          onConflict: "client_id",
        });
      if (settingsError) throw settingsError;

      return json(toSummary({
        ...updatedClient,
        integration_settings: [{
          bitrix,
          general,
          pf: { accounts: pfAccounts },
          bayut: { accounts: bayutAccounts },
          dubizzle: existingSettings?.dubizzle ?? { accounts: [] },
        }],
      }, origin));
    }

    if (request.method === "DELETE" && targetClientId) {
      assertClientId(targetClientId);
      const { error } = await client.from("clients").delete().eq("client_id", targetClientId);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
