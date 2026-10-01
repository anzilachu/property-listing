export type ThemePreference = "light" | "dark";

export type ClientSummary = {
  clientId: string;
  publicSlug: string;
  companyName: string;
  portalHost: string;
  link: string;
  createdAt: string;
  general: {
    theme: ThemePreference;
    accentColor: string;
    logoUrl?: string | null;
  };
  bitrix: {
    entityTypeId: number;
  };
  accounts: {
    pf: Array<{
      label: string;
      clientId: string;
    }>;
    bayut: Array<{
      label: string;
    }>;
  };
  integrations: {
    bitrix: boolean;
    pfAccounts: number;
    bayutAccounts: number;
    dubizzleAccounts: number;
  };
};

export type PublicClientInfo = {
  clientId: string;
  publicSlug: string;
  companyName: string;
  portalHost: string;
  logoUrl?: string | null;
  theme: ThemePreference;
  accentColor: string;
};

export type Listing = {
  id: string;
  title: string;
  reference?: string | null;
  thumbnailUrl?: string | null;
  type?: string | null;
  purpose?: string | null;
  beds?: string | null;
  baths?: string | null;
  sizeSqft?: number | null;
  parking?: string | null;
  pfLocationName?: string | null;
  bayutLocationName?: string | null;
  priceAed?: number | null;
  stageName: string;
  stageSemantic: "process" | "success" | "failure" | "unknown";
  agentName?: string | null;
  ownerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  portals: {
    propertyFinder: boolean;
    bayut: boolean;
    dubizzle: boolean;
    website: boolean;
  };
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  amenities?: string[];
  rawGroups?: Record<string, Record<string, string | number | boolean | null>>;
};

export type PaginatedListings = {
  rows: Listing[];
  total: number;
  next?: number | null;
  missingMappings?: string[];
};

export type Person = {
  bitrixUserId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  workPosition?: string | null;
  pfId?: string | null;
  bayutId?: string | null;
  brn?: string | null;
  listingCount?: number;
  multiAccount?: boolean;
};
