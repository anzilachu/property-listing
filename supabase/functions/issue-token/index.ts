import { handleOptions, json } from "../_shared/cors.ts";
import { signClientToken } from "../_shared/crypto.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertClientKey, hostFromOrigin } from "../_shared/validation.ts";

function parseIssueTokenInput(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const body = value as Record<string, unknown>;
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const parentOrigin = typeof body.parentOrigin === "string" ? body.parentOrigin.trim() : "";
  if (!clientId) throw new Error("Client ID is required.");
  if (!parentOrigin) throw new Error("Parent origin is required.");
  new URL(parentOrigin);
  return { clientId, parentOrigin };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const input = parseIssueTokenInput(await request.json());
    assertClientKey(input.clientId);
    const alternateClientKey = input.clientId.includes("_")
      ? input.clientId.replaceAll("_", "-")
      : input.clientId.replaceAll("-", "_");
    const client = serviceClient();
    const { data, error } = await client
      .from("clients")
      .select("client_id, public_slug, portal_host")
      .or(`client_id.eq.${input.clientId},public_slug.eq.${input.clientId},public_slug.eq.${alternateClientKey}`)
      .single();
    if (error || !data) return json({ error: "Unknown client." }, { status: 404 });
    if (hostFromOrigin(input.parentOrigin) !== data.portal_host) {
      return json({ error: "Parent portal does not match this client." }, { status: 403 });
    }
    return json(await signClientToken({ clientId: data.client_id, parentOrigin: input.parentOrigin, portalHost: data.portal_host }));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 400 });
  }
});
