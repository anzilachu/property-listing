const privateHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const reservedClientIds = new Set(["admin", "api", "login", "assets", "auth", "functions", "static"]);

export function assertClientId(clientId: string) {
  if (!/^[a-z0-9][a-z0-9_]{2,80}$/.test(clientId) || reservedClientIds.has(clientId)) {
    throw new Error("Invalid or reserved client ID.");
  }
}

export function assertClientKey(clientKey: string) {
  if (!/^[a-z0-9][a-z0-9_-]{1,80}$/.test(clientKey) || reservedClientIds.has(clientKey)) {
    throw new Error("Invalid or reserved client key.");
  }
}

export function validateWebhookUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Webhook URL must use https.");
  if (privateHostnames.has(url.hostname)) throw new Error("Webhook URL cannot target localhost or private hosts.");
  if (/^(10|127|169\.254|192\.168)\./.test(url.hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)) {
    throw new Error("Webhook URL cannot target private IP ranges.");
  }
  if (!/\/rest\/\d+\/[^/]+\/?$/.test(url.pathname)) {
    throw new Error("Webhook URL must end with /rest/{userId}/{key}/.");
  }
  return {
    normalized: value.endsWith("/") ? value : `${value}/`,
    portalHost: url.host,
  };
}

export function hostFromOrigin(origin: string) {
  return new URL(origin).host;
}
