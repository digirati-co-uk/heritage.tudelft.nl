export function extract(config, handler) {
  if (!config) return;
  global.__hss = global.__hss ? global.__hss : {};
  global.__hss.extractions = global.__hss.extractions
    ? global.__hss.extractions
    : [];
  global.__hss.extractions.push({
    invalidate: async () => true,
    ...config,
    handler: handler,
  });
}

export function enrich(config, handler) {
  if (!config || !handler) return;
  global.__hss = global.__hss ? global.__hss : {};
  global.__hss.enrichments = global.__hss.enrichments
    ? global.__hss.enrichments
    : [];
  global.__hss.enrichments.push({
    invalidate: async () => true,
    ...config,
    handler: handler,
  });
}

export function rewrite(config) {
  if (!config) return;
  global.__hss = global.__hss ? global.__hss : {};
  global.__hss.rewrites = global.__hss.rewrites ? global.__hss.rewrites : [];
  global.__hss.rewrites.push(config);
}

export function generator(config) {
  if (!config) return;
  global.__hss = global.__hss ? global.__hss : {};
  global.__hss.generators = global.__hss.generators
    ? global.__hss.generators
    : [];
  global.__hss.generators.push(config);
}
