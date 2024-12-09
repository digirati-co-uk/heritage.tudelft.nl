import { Extraction } from "../util/extract.ts";

export const extractCanvasDims: Extraction = {
  id: "extract-canvas-dims",
  name: "Extract canvas dimensions",
  types: ["Canvas"],
  async invalidate(canvas, api) {
    const cache = await api.caches.value;
    return !cache.dims;
  },
  async handler(canvas, api) {
    const resource = api.resource;
    return {
      caches: {
        dims: true,
      },
      meta: {
        width: resource.width,
        height: resource.height,
      },
    };
  },
};
