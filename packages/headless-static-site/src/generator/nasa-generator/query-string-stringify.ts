export function queryStringStringify<T>(obj: T) {
  const query = new URLSearchParams();

  const keys = obj ? Object.keys(obj as any) : [];
  for (const key of keys) {
    const value = (obj as any)[key];
    if (typeof value !== 'undefined' && value !== null) {
      if (Array.isArray(value)) {
        query.set(key, value.join(','));
      } else {
        query.set(key, value.toString());
      }
    }
  }

  return query.toString();
}
