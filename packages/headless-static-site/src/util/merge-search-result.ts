import type { SearchRecordReturn } from "./extract";

export function mergeSearchResult(a: Partial<SearchRecordReturn>, b: Partial<SearchRecordReturn>): SearchRecordReturn {
  a.remoteRecords = a.remoteRecords || {};

  for (const index of Object.keys(b.remoteRecords || {})) {
    a.remoteRecords[index] = a.remoteRecords[index] || [];
    const remoteRecords = b.remoteRecords?.[index] || [];
    for (const remoteRecord of remoteRecords) {
      const found = a.remoteRecords[index].findIndex((record) => {
        return record.recordId === remoteRecord.recordId || record.url === remoteRecord.url;
      });

      if (found === -1) {
        a.remoteRecords[index].push(remoteRecord);
      } else {
        a.remoteRecords[index][found] = {
          ...a.remoteRecords[index][found],
          ...remoteRecord,
        };
      }
    }
  }

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
