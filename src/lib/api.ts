import { z } from "zod";
import { assertSupabaseConfigured, functionsBaseUrl, supabase } from "./supabase";
import type { ClientSummary, PaginatedListings, Person, PublicClientInfo } from "../types/domain";
import { localPreviewEnabled, previewClientId, previewInfoForClient } from "./devPreview";

const jsonHeaders = { "Content-Type": "application/json" };
const adminClientsCacheKey = "prophub.adminClients";

async function readJson<T>(response: Response, schema?: z.ZodType<T>) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return schema ? schema.parse(payload) : (payload as T);
}

async function adminAuthHeader() {
  assertSupabaseConfigured();
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session required.");
  return { Authorization: `Bearer ${token}` };
}

function cacheAdminClients(clients: ClientSummary[]) {
  localStorage.setItem(adminClientsCacheKey, JSON.stringify(clients));
}

function normalizeClientSummary(value: Partial<ClientSummary> & { clientId: string; companyName: string; portalHost: string; link: string; createdAt: string }): ClientSummary {
  return {
    ...value,
    publicSlug: value.publicSlug ?? value.clientId,
    general: {
      theme: value.general?.theme === "dark" ? "dark" : "light",
      accentColor: value.general?.accentColor ?? "#0c8f65",
      logoUrl: value.general?.logoUrl ?? null,
    },
    bitrix: {
      entityTypeId: value.bitrix?.entityTypeId ?? 1052,
    },
    accounts: {
      pf: value.accounts?.pf ?? [],
      bayut: value.accounts?.bayut ?? [],
    },
    integrations: {
      bitrix: value.integrations?.bitrix ?? false,
      pfAccounts: value.integrations?.pfAccounts ?? value.accounts?.pf?.length ?? 0,
      bayutAccounts: value.integrations?.bayutAccounts ?? value.accounts?.bayut?.length ?? 0,
      dubizzleAccounts: value.integrations?.dubizzleAccounts ?? 0,
    },
  };
}

function normalizeClientSummaries(values: ClientSummary[]) {
  return values.map((value) => normalizeClientSummary(value));
}

function mergeCachedAdminClient(client: ClientSummary) {
  const normalizedClient = normalizeClientSummary(client);
  try {
    const cached = JSON.parse(localStorage.getItem(adminClientsCacheKey) ?? "[]") as ClientSummary[];
    const withoutCurrent = cached.filter((item) => item.clientId !== normalizedClient.clientId);
    cacheAdminClients([normalizedClient, ...normalizeClientSummaries(withoutCurrent)]);
  } catch {
    cacheAdminClients([normalizedClient]);
  }
}

function readCachedPublicClientInfo(clientId: string): PublicClientInfo | null {
  try {
    const cached = normalizeClientSummaries(JSON.parse(localStorage.getItem(adminClientsCacheKey) ?? "[]") as ClientSummary[]);
    const client = cached.find((item) => item.clientId === clientId || item.publicSlug === clientId);
    if (!client) return null;
    return {
      clientId: client.clientId,
      publicSlug: client.publicSlug,
      companyName: client.companyName,
      portalHost: client.portalHost,
      logoUrl: client.general.logoUrl ?? null,
      theme: client.general.theme,
      accentColor: client.general.accentColor,
    };
  } catch {
    return null;
  }
}

export async function fetchAdminClients() {
  const headers = await adminAuthHeader();
  const clients = normalizeClientSummaries(await readJson<ClientSummary[]>(
    await fetch(`${functionsBaseUrl}/admin-clients`, { headers }),
  ));
  cacheAdminClients(clients);
  return clients;
}

export async function createAdminClient(input: {
  companyName: string;
}) {
  const headers = await adminAuthHeader();
  const client = normalizeClientSummary(await readJson<ClientSummary>(
    await fetch(`${functionsBaseUrl}/admin-clients`, {
      method: "POST",
      headers: { ...headers, ...jsonHeaders },
      body: JSON.stringify(input),
    }),
  ));
  mergeCachedAdminClient(client);
  return client;
}

export async function updateAdminClient(clientId: string, input: Record<string, unknown>) {
  const headers = await adminAuthHeader();
  const client = normalizeClientSummary(await readJson<ClientSummary>(
    await fetch(`${functionsBaseUrl}/admin-clients?clientId=${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: { ...headers, ...jsonHeaders },
      body: JSON.stringify(input),
    }),
  ));
  mergeCachedAdminClient(client);
  return client;
}

export async function deleteAdminClient(clientId: string) {
  const headers = await adminAuthHeader();
  await readJson(
    await fetch(`${functionsBaseUrl}/admin-clients?clientId=${encodeURIComponent(clientId)}`, {
      method: "DELETE",
      headers,
    }),
  );
}

export async function fetchPublicClientInfo(clientId: string) {
  if (localPreviewEnabled && (!supabase || clientId === previewClientId)) {
    return previewInfoForClient(clientId);
  }
  try {
    assertSupabaseConfigured();
    return await readJson<PublicClientInfo>(
      await fetch(`${functionsBaseUrl}/client-public-info?clientId=${encodeURIComponent(clientId)}`),
    );
  } catch (error) {
    const cached = readCachedPublicClientInfo(clientId);
    if (cached && localPreviewEnabled) return cached;
    if (localPreviewEnabled) return previewInfoForClient(clientId);
    throw error;
  }
}

export async function issueClientToken(clientId: string, parentOrigin: string) {
  if (localPreviewEnabled) {
    return {
      token: `local-preview-token:${clientId}:${parentOrigin}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  }
  assertSupabaseConfigured();
  return readJson<{ token: string; expiresAt: string }>(
    await fetch(`${functionsBaseUrl}/issue-token`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ clientId, parentOrigin }),
    }),
  );
}

export async function fetchListings(clientId: string, token: string, search: string) {
  if (localPreviewEnabled) {
    return { rows: [], total: 0, next: null, missingMappings: [] } satisfies PaginatedListings;
  }
  const params = new URLSearchParams({ clientId });
  if (search) params.set("search", search);
  return readJson<PaginatedListings>(
    await fetch(`${functionsBaseUrl}/listings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

export async function fetchAgents(clientId: string, token: string) {
  if (localPreviewEnabled) {
    return [] satisfies Person[];
  }
  return readJson<Person[]>(
    await fetch(`${functionsBaseUrl}/agents?clientId=${encodeURIComponent(clientId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

export async function fetchOwners(clientId: string, token: string) {
  if (localPreviewEnabled) {
    return [] satisfies Person[];
  }
  return readJson<Person[]>(
    await fetch(`${functionsBaseUrl}/owners?clientId=${encodeURIComponent(clientId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}
