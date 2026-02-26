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
  topics?: {
    available: boolean;
    totalItems: number;
    slug: string | null;
    label: string;
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

export type MetadataAnalysis = {
  foundKeys: Record<string, number>;
  foundValues: Record<string, Record<string, number>>;
  foundValuesComma: Record<string, Record<string, number>>;
  foundLanguages: Record<string, number>;
  foundUniqueKeys: string[];
};

export type ExtractTopicsConfig = {
  language?: string;
  translate?: boolean;
  commaSeparated?: string[];
  topicTypes: Record<string, string[]>;
};

export type MetadataAnalysisResponse = {
  analysis: MetadataAnalysis | null;
  extractTopicsConfig: ExtractTopicsConfig | null;
  outputPath: string;
  canWrite: boolean;
  warnings: string[];
};

export type CreateMetadataCollectionRequest = {
  mode?: "merge" | "replace";
  language?: string;
  translate?: boolean;
  commaSeparated?: string[];
  topicTypes: Record<string, string[]>;
};

export type CreateMetadataCollectionResponse = {
  saved: boolean;
  path: string;
  extractTopicsConfig: ExtractTopicsConfig;
  rebuild?: {
    triggered: boolean;
    mode: "full";
    ok: boolean;
    error: string | null;
  };
  warnings: string[];
};
