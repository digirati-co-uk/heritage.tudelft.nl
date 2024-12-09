import { readdirSync } from 'fs';

export function isEmpty(path: string) {
  return readdirSync(path).length === 0;
}
