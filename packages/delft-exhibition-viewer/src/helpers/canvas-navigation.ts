export function getCanvasNavigationId(index: number) {
  return `s${index}`;
}

export function getCanvasNavigationHref(index: number) {
  return `#${getCanvasNavigationId(index)}`;
}

export function parseCanvasNavigationIndex(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value.startsWith("s") ? value.slice(1) : value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
