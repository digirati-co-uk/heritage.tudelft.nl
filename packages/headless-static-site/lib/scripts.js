function ensureRegistry(key) {
  global.__hss = global.__hss ? global.__hss : {};
  global.__hss[key] = global.__hss[key] ? global.__hss[key] : [];
  return global.__hss[key];
}

function upsertById(items, item) {
  if (!item || !item.id) {
    items.push(item);
    return;
  }
  const existingIndex = items.findIndex(
    (entry) => entry && entry.id === item.id,
  );
  if (existingIndex === -1) {
    items.push(item);
    return;
  }
  items[existingIndex] = item;
}

export function extract(config, handler) {
  if (!config) return;
  const extractions = ensureRegistry("extractions");
  upsertById(extractions, {
    invalidate: async () => true,
    ...config,
    handler: handler,
  });
}

export function enrich(config, handler) {
  if (!config || !handler) return;
  const enrichments = ensureRegistry("enrichments");
  upsertById(enrichments, {
    invalidate: async () => true,
    ...config,
    handler: handler,
  });
}

export function linker(config, handler) {
  if (!config || !handler) return;
  const linkers = ensureRegistry("linkers");
  upsertById(linkers, {
    ...config,
    handler: handler,
  });
}

export function rewrite(config) {
  if (!config) return;
  const rewrites = ensureRegistry("rewrites");
  upsertById(rewrites, config);
}

export function generator(config) {
  if (!config) return;
  const generators = ensureRegistry("generators");
  upsertById(generators, config);
}
