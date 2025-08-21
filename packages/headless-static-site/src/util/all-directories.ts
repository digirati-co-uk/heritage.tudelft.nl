export function allDirectories(fileList: string[]): string[] {
  const allDirs: string[] = [];

  for (const file of fileList) {
    const parts = file.split("/");
    const len = parts.length;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const parent = parts.slice(0, i).join("/");

      if (i !== len - 1) continue;

      if (parent && !allDirs.includes(parent)) {
        allDirs.push(parent);
      }

      const fullPath = parent ? `${parent}/${part}` : part;
      if (fullPath && !allDirs.includes(fullPath)) {
        allDirs.push(fullPath);
      }
    }
  }

  return allDirs;
}
