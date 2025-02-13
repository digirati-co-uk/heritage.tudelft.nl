export function mergeIndices(
  newindices: Record<string, string[]>,
  indices: Record<string, string[]>,
) {
  const keys = Object.keys(indices);
  for (const key of keys) {
    if (!newindices[key]) {
      newindices[key] = [];
    }
    for (const item of indices[key]) {
      if (!newindices[key].includes(item)) {
        newindices[key].push(item);
      }
    }
  }

  return newindices;
}
