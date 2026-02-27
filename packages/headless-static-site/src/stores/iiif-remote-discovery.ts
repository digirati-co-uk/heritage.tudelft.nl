export interface RemoteChildReference {
  id: string;
  type?: string;
}

function getType(input: any): string | undefined {
  if (!input) {
    return undefined;
  }
  const raw = input.type || input["@type"];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  if (typeof raw === "string") {
    return raw;
  }
  return undefined;
}

function getId(input: any): string | undefined {
  if (!input) {
    return undefined;
  }
  if (typeof input === "string") {
    return input;
  }
  const id = input.id || input["@id"];
  return typeof id === "string" ? id : undefined;
}

function normalizeType(type?: string) {
  if (!type) {
    return undefined;
  }
  if (type.endsWith("CollectionPage")) {
    return "CollectionPage";
  }
  if (type.endsWith("Collection")) {
    return "Collection";
  }
  if (type.endsWith("Manifest")) {
    return "Manifest";
  }
  return type;
}

function toReference(input: any, fallbackType?: string): RemoteChildReference | null {
  const id = getId(input);
  if (!id) {
    return null;
  }
  const type = normalizeType(getType(input) || fallbackType);
  return { id, type };
}

function asArray<T = any>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function isCollectionLike(resource: any) {
  const type = normalizeType(getType(resource));
  return type === "Collection" || type === "CollectionPage";
}

function getDirectChildren(resource: any): RemoteChildReference[] {
  const children: RemoteChildReference[] = [];

  for (const item of asArray(resource?.items)) {
    const ref = toReference(item);
    if (ref) children.push(ref);
  }
  for (const item of asArray(resource?.manifests)) {
    const ref = toReference(item, "Manifest");
    if (ref) children.push(ref);
  }
  for (const item of asArray(resource?.collections)) {
    const ref = toReference(item, "Collection");
    if (ref) children.push(ref);
  }

  return children;
}

function getPaginationLinks(resource: any): string[] {
  const links: string[] = [];
  for (const candidate of [...asArray(resource?.first), ...asArray(resource?.next)]) {
    const ref = toReference(candidate, "CollectionPage");
    if (ref?.id) {
      links.push(ref.id);
    }
  }
  return links;
}

export async function discoverCollectionChildren(
  startUrl: string,
  startResource: any,
  fetchJson: (url: string) => Promise<any>,
  onError?: (url: string, error: unknown) => void
): Promise<RemoteChildReference[]> {
  const discovered = new Map<string, RemoteChildReference>();
  const visitedPages = new Set<string>();
  const pendingPages: Array<{ url: string; resource: any }> = [{ url: startUrl, resource: startResource }];

  while (pendingPages.length > 0) {
    const current = pendingPages.shift();
    if (!current) {
      continue;
    }
    if (visitedPages.has(current.url)) {
      continue;
    }
    visitedPages.add(current.url);

    for (const child of getDirectChildren(current.resource)) {
      if (child.type === "CollectionPage") {
        if (!visitedPages.has(child.id)) {
          try {
            const page = await fetchJson(child.id);
            pendingPages.push({ url: child.id, resource: page });
          } catch (error) {
            onError?.(child.id, error);
          }
        }
        continue;
      }
      if (!discovered.has(child.id)) {
        discovered.set(child.id, child);
      }
    }

    for (const pageUrl of getPaginationLinks(current.resource)) {
      if (visitedPages.has(pageUrl)) {
        continue;
      }
      try {
        const page = await fetchJson(pageUrl);
        pendingPages.push({ url: pageUrl, resource: page });
      } catch (error) {
        onError?.(pageUrl, error);
      }
    }
  }

  return Array.from(discovered.values());
}
