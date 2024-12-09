import { InternationalString } from '@iiif/presentation-3';

export function stringToLang(
  input: string | string[] | InternationalString | Record<string, string>
): InternationalString {
  if (typeof input === 'string') {
    return { none: [input] };
  }
  if (Array.isArray(input)) {
    return { none: input };
  }

  const keys = Object.keys(input);
  if (keys.length === 0) {
    return { none: [] };
  }

  const lang: InternationalString = {};
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string') {
      lang[key] = [value];
    } else {
      lang[key] = value;
    }
  }
  return lang;
}
