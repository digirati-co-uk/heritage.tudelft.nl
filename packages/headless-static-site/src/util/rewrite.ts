export interface Rewrite {
  id: string;
  name: string;
  types: string[];
  rewrite?: (
    slug: string,
    resource: { id?: string; type: string },
  ) => string | Promise<string>;
}
