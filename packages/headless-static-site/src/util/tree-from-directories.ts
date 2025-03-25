export function treeFromDirectories(
  directories: string[],
  initialTree?: { [key: string]: string[] },
) {
  const tree: { [key: string]: string[] } = initialTree || {};
  for (const directory of directories) {
    const parts = directory.split("/");
    const len = parts.length;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const parent = parts.slice(0, i).join("/");
      if (i !== len - 1) continue;
      if (!tree[parent]) {
        tree[parent] = [];
      }
      if (part && !tree[parent].includes(part)) {
        tree[parent].push(part);
      }
    }
  }

  return tree;
}
