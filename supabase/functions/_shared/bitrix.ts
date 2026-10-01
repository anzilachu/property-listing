import { decryptSecret } from "./crypto.ts";

export type IntegrationSettings = {
  client_id: string;
  bitrix: Record<string, unknown>;
  field_mapping: Record<string, string>;
  field_dictionaries: Record<string, Record<string, string>>;
};

export async function getWebhookUrl(settings: IntegrationSettings) {
  const encrypted = settings.bitrix.webhookEncrypted as { iv: string; ciphertext: string } | undefined;
  if (!encrypted) throw new Error("Bitrix webhook is not connected.");
  return decryptSecret(encrypted);
}

export async function bitrixCall<T>(webhookUrl: string, method: string, params: Record<string, unknown> = {}) {
  const url = new URL(method, webhookUrl);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description ?? payload.error ?? `Bitrix ${method} failed.`);
  }
  return payload.result as T;
}

export function decodeHtml(value: unknown) {
  if (typeof value !== "string") return value;
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function enumLabel(dictionaries: Record<string, Record<string, string>>, key: string | undefined, raw: unknown) {
  if (!key || raw == null) return null;
  const dictionary = dictionaries[key] ?? {};
  if (Array.isArray(raw)) return raw.map((item) => dictionary[String(item)] ?? String(item)).join(", ");
  return dictionary[String(raw)] ?? String(raw);
}

export function semanticFromBitrix(value?: string) {
  if (value === "S") return "success";
  if (value === "F") return "failure";
  if (value === "P") return "process";
  return "unknown";
}

export function normaliseBoolean(value: unknown) {
  return value === true || value === "Y" || value === "1" || value === 1;
}

export async function pagedBitrixList<T>(webhookUrl: string, entityTypeId: number, params: Record<string, unknown>) {
  const rows: T[] = [];
  let start: number | undefined = 0;
  do {
    const result = await bitrixCall<{ items: T[]; next?: number }>(webhookUrl, "crm.item.list", {
      entityTypeId,
      ...params,
      start,
    });
    rows.push(...(result.items ?? []));
    start = result.next;
    if (start != null) await new Promise((resolve) => setTimeout(resolve, 550));
  } while (start != null);
  return rows;
}
