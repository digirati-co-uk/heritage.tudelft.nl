const memoryStorage = new Map<string, string>();

export function getSessionSeed(key: string) {
  const existing = Number(getSessionValue(key));
  if (existing > 0) return existing;

  const seed = createSeed();
  setSessionValue(key, String(seed));
  return seed;
}

export function createSeed() {
  return Math.floor((Date.now() + Math.random() * 1000) % 2147483647) || 1;
}

export function createSessionCacheKey(prefix: string, parts: unknown[]) {
  return `${prefix}:${hashString(JSON.stringify(parts))}`;
}

export function getSessionJSON<T>(key: string) {
  const value = getSessionValue(key);
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function setSessionJSON(key: string, value: unknown) {
  setSessionValue(key, JSON.stringify(value));
}

export function getSessionValue(key: string) {
  const fallbackValue = memoryStorage.get(key);

  try {
    if (typeof sessionStorage === "undefined") return fallbackValue;
    return sessionStorage.getItem(key) || fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function setSessionValue(key: string, value: string) {
  memoryStorage.set(key, value);

  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage quota and private-mode failures.
  }
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
