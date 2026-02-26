export type SiteFeaturedItem = {
  id: string | null;
  slug: string | null;
  label: string | null;
  thumbnail: string | null;
  type: string | null;
  source: any;
  diskPath: string | null;
};

export type SiteResponse = {
  baseUrl: string;
  build: {
    status: "idle" | "building" | "ready" | "error";
    startedAt: string | null;
    completedAt: string | null;
    lastError: string | null;
    buildCount: number;
  };
  onboarding: {
    enabled: boolean;
    configMode: string;
    contentFolder: string | null;
    shorthand?: {
      enabled: boolean;
      urls: string[];
      saveManifests: boolean;
      overrides: string;
    } | null;
    hints?: {
      addContent?: string;
      astro?: string;
      vite?: string;
    };
  };
  featuredItems: SiteFeaturedItem[];
};

export type ResourceResponse = {
  slug: string;
  type: "Manifest" | "Collection" | null;
  source: any;
  diskPath: string | null;
  isEditable: boolean;
  editablePath: string | null;
  resource: any;
  meta: Record<string, any>;
  indices: Record<string, any>;
  links: {
    json: string | null;
    localJson: string | null;
    remoteJson: string | null;
    manifestEditor: string | null;
    theseus: string | null;
  };
};

export type CollectionItem = {
  id: string | null;
  type: string | null;
  slug: string;
  label: string;
  thumbnail: string | null;
};

export type ResourceFilter = "all" | "manifest" | "collection";
