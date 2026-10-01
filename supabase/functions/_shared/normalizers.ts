import { decodeHtml, enumLabel, normaliseBoolean, semanticFromBitrix } from "./bitrix.ts";

const forbiddenFileHints = [
  "passport",
  "emirates",
  "title deed",
  "noc",
  "contract",
  "listing form",
  "poa",
  "document",
];

export const canonicalFields = [
  "referenceNumber",
  "price",
  "propertyPurpose",
  "priceType",
  "category",
  "typePropertyFinder",
  "typeBayut",
  "bedrooms",
  "bathrooms",
  "size",
  "parkingSlots",
  "descriptionEn",
  "descriptionAr",
  "portals",
  "amenitiesPropertyFinder",
  "amenitiesBayut",
  "originalImages",
  "propertyFinderId",
  "bayutListingId",
  "pfLocationName",
  "bayutLocationName",
  "listingOwner",
];

export function autoMapFields(fields: Record<string, { title?: string; type?: string; items?: { ID: string; VALUE: string }[] }>) {
  const titleToCanonical: Record<string, string> = {
    "reference number": "referenceNumber",
    "price in aed": "price",
    "property_purpose": "propertyPurpose",
    "pricetype": "priceType",
    "category": "category",
    "type propertyfinder": "typePropertyFinder",
    "type bayut": "typeBayut",
    "bedrooms": "bedrooms",
    "bathrooms": "bathrooms",
    "size": "size",
    "parking slots": "parkingSlots",
    "description en": "descriptionEn",
    "description ar": "descriptionAr",
    "portals": "portals",
    "amenities for propertyfinder": "amenitiesPropertyFinder",
    "amenities for bayut": "amenitiesBayut",
    "original images": "originalImages",
    "propertyfinderid": "propertyFinderId",
    "bayut listing id": "bayutListingId",
    "pf location name": "pfLocationName",
    "bayut location name": "bayutLocationName",
    "listing owner": "listingOwner",
  };
  const mapping: Record<string, string> = {};
  const dictionaries: Record<string, Record<string, string>> = {};
  for (const [key, definition] of Object.entries(fields)) {
    const title = (definition.title ?? key).toLowerCase().trim();
    const canonical = titleToCanonical[title];
    if (canonical && !forbiddenFileHints.some((hint) => title.includes(hint))) {
      mapping[canonical] = key;
    }
    if (definition.items?.length) {
      dictionaries[key] = Object.fromEntries(definition.items.map((item) => [String(item.ID), item.VALUE]));
    }
  }
  return { mapping, dictionaries };
}

export function normaliseListing(
  item: Record<string, unknown>,
  mapping: Record<string, string>,
  dictionaries: Record<string, Record<string, string>>,
  stageNames: Record<string, { name: string; semantics?: string }>,
  users: Record<string, { name: string }>,
  imageTokenUrl?: (itemId: string, fileId: string) => string,
) {
  const get = (canonical: string) => item[mapping[canonical]];
  const stage = stageNames[String(item.stageId)] ?? { name: String(item.stageId ?? "Unknown") };
  const portals = String(enumLabel(dictionaries, mapping.portals, get("portals")) ?? "").toLowerCase();
  const firstImage = Array.isArray(get("originalImages")) ? (get("originalImages") as Array<{ id?: string; ID?: string }>)[0] : null;
  const firstImageId = firstImage?.id ?? firstImage?.ID;
  return {
    id: String(item.id),
    title: String(decodeHtml(item.title ?? "Untitled listing")),
    reference: String(get("referenceNumber") ?? ""),
    thumbnailUrl: firstImageId && imageTokenUrl ? imageTokenUrl(String(item.id), String(firstImageId)) : null,
    type: enumLabel(dictionaries, mapping.typePropertyFinder, get("typePropertyFinder")),
    purpose: enumLabel(dictionaries, mapping.propertyPurpose, get("propertyPurpose")),
    beds: enumLabel(dictionaries, mapping.bedrooms, get("bedrooms")),
    baths: enumLabel(dictionaries, mapping.bathrooms, get("bathrooms")),
    sizeSqft: Number(get("size")) || null,
    parking: enumLabel(dictionaries, mapping.parkingSlots, get("parkingSlots")),
    pfLocationName: String(get("pfLocationName") ?? ""),
    bayutLocationName: String(get("bayutLocationName") ?? ""),
    priceAed: Number(get("price")) || null,
    stageName: stage.name,
    stageSemantic: semanticFromBitrix(stage.semantics),
    agentName: users[String(item.assignedById)]?.name ?? null,
    ownerName: null,
    createdAt: String(item.createdTime ?? ""),
    updatedAt: String(item.updatedTime ?? ""),
    portals: {
      propertyFinder: portals.includes("property finder") || !!get("propertyFinderId"),
      bayut: portals.includes("bayut") || !!get("bayutListingId"),
      dubizzle: portals.includes("dubizzle"),
      website: portals.includes("website"),
    },
    descriptionEn: String(decodeHtml(get("descriptionEn") ?? "")),
    descriptionAr: String(decodeHtml(get("descriptionAr") ?? "")),
    amenities: String(enumLabel(dictionaries, mapping.amenitiesPropertyFinder, get("amenitiesPropertyFinder")) ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export function normalisePerson(user: Record<string, unknown>, listingCount = 0) {
  const name = [user.NAME, user.LAST_NAME].filter(Boolean).join(" ") || String(user.LOGIN ?? user.ID);
  const pf = user.UF_USR_PF_ID;
  const bayut = user.UF_USR_BAYUT_ID;
  const countIds = (value: unknown) => Array.isArray(value) ? value.length : value ? 1 : 0;
  return {
    bitrixUserId: String(user.ID),
    name,
    email: String(user.EMAIL ?? ""),
    avatarUrl: String(user.PERSONAL_PHOTO ?? ""),
    workPosition: String(user.WORK_POSITION ?? ""),
    pfId: Array.isArray(pf) ? pf.join(", ") : String(pf ?? ""),
    bayutId: Array.isArray(bayut) ? bayut.join(", ") : String(bayut ?? ""),
    brn: String(user.UF_BRN ?? ""),
    listingCount,
    multiAccount: countIds(pf) + countIds(bayut) > 1,
    isAgent: normaliseBoolean(pf) || normaliseBoolean(bayut) || countIds(pf) > 0 || countIds(bayut) > 0,
  };
}
