export interface ObjectLink {
  service: string;
  slug: string;
  canvasId: string;
  targetCanvasId: string;
  component?: any;
}

/** Match DLCS image and thumbnail service variants without changing request URLs. */
export function normalizeImageServiceId(id: string): string {
  return id.replace(/\/(?:iiif-img|thumbs)\/(?:v[23]\/)?/, "/iiif-img/").replace(/\/$/, "");
}
