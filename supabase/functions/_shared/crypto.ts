const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function encryptionKey() {
  const raw = Deno.env.get("ENCRYPTION_KEY");
  if (!raw) throw new Error("ENCRYPTION_KEY is not configured.");
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  if (bytes.byteLength !== 32) throw new Error("ENCRYPTION_KEY must be a 32-byte base64 key.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plainText: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plainText)));
  return {
    alg: "AES-256-GCM",
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...encrypted)),
  };
}

export async function decryptSecret(payload: { iv: string; ciphertext: string }) {
  const key = await encryptionKey();
  const iv = Uint8Array.from(atob(payload.iv), (char) => char.charCodeAt(0));
  const bytes = Uint8Array.from(atob(payload.ciphertext), (char) => char.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes);
  return decoder.decode(decrypted);
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signingKey() {
  const secret = Deno.env.get("TOKEN_SIGNING_SECRET");
  if (!secret) throw new Error("TOKEN_SIGNING_SECRET is not configured.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signClientToken(payload: { clientId: string; parentOrigin: string; portalHost: string }) {
  const exp = Math.floor(Date.now() / 1000) + 600;
  const body = { ...payload, exp };
  const encodedBody = base64Url(encoder.encode(JSON.stringify(body)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(encodedBody)));
  return { token: `${encodedBody}.${base64Url(signature)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function verifyClientToken(token: string, clientId: string) {
  const [encodedBody, encodedSignature] = token.split(".");
  if (!encodedBody || !encodedSignature) throw new Error("Invalid token.");
  const valid = await crypto.subtle.verify("HMAC", await signingKey(), fromBase64Url(encodedSignature), encoder.encode(encodedBody));
  if (!valid) throw new Error("Invalid token signature.");
  const payload = JSON.parse(decoder.decode(fromBase64Url(encodedBody))) as { clientId: string; parentOrigin: string; portalHost: string; exp: number };
  if (payload.clientId !== clientId) throw new Error("Token client mismatch.");
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired.");
  return payload;
}
