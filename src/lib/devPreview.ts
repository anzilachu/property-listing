export const localPreviewEnabled =
  import.meta.env.DEV
    ? import.meta.env.VITE_DISABLE_LOCAL_PREVIEW !== "true"
    : import.meta.env.VITE_DISABLE_LOCAL_PREVIEW === "false";

export const previewClientId = "local_preview_12345678";

export const previewClientInfo = {
  clientId: previewClientId,
  publicSlug: previewClientId,
  companyName: "PropHub Preview",
  portalHost: "preview.local",
  logoUrl: null,
  theme: "light" as const,
  accentColor: "#0c8f65",
};

export function previewInfoForClient(clientId: string) {
  const name = clientId
    .replace(/_\d+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

  return {
    ...previewClientInfo,
    clientId,
    publicSlug: clientId,
    companyName: name || previewClientInfo.companyName,
  };
}
