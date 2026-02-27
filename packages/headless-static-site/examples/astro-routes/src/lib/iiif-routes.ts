export const iiifRoutes = {
  manifests: "objects",
  collections: "browser",
} as const;

export const manifestRouteBase = `/${iiifRoutes.manifests}`;
export const collectionRouteBase = `/${iiifRoutes.collections}`;
