export type PortalListingPayload = {
  bitrixItemId: string;
  clientId: string;
  mappedFields: Record<string, unknown>;
};

export type PortalPublishResult = {
  portalListingId: string;
  status: "created" | "updated" | "failed";
  message?: string;
};

export interface PortalAdapter {
  readonly portal: "property_finder" | "bayut" | "dubizzle";
  publish(payload: PortalListingPayload): Promise<PortalPublishResult>;
  unpublish(portalListingId: string): Promise<PortalPublishResult>;
}

export class PropertyFinderAdapter implements PortalAdapter {
  readonly portal = "property_finder" as const;

  async publish(): Promise<PortalPublishResult> {
    throw new Error("Property Finder publishing is a Phase 2 placeholder. Do not guess partner APIs.");
  }

  async unpublish(): Promise<PortalPublishResult> {
    throw new Error("Property Finder publishing is a Phase 2 placeholder. Do not guess partner APIs.");
  }
}

export class BayutAdapter implements PortalAdapter {
  readonly portal = "bayut" as const;

  async publish(): Promise<PortalPublishResult> {
    throw new Error("Bayut/Dubizzle publishing is a Phase 2 placeholder. Do not guess partner APIs.");
  }

  async unpublish(): Promise<PortalPublishResult> {
    throw new Error("Bayut/Dubizzle publishing is a Phase 2 placeholder. Do not guess partner APIs.");
  }
}
