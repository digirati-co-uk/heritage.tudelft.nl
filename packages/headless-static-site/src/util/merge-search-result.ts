import type { SearchRecordReturn } from "./extract";

export function mergeSearchResult(a: Partial<SearchRecordReturn>, b: Partial<SearchRecordReturn>): SearchRecordReturn {
  a.indexes = a.indexes || [];
  for (const index of b.indexes || []) {
    if (!a.indexes.includes(index)) {
      a.indexes.push(index);
    }
  }

  a.record = {
    ...a.record,
    ...b.record,
  };

  return a as SearchRecordReturn;
}
