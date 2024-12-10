import translate from "translate";

const cache: Record<string, string> = {};
export async function cachedTranslate(_text: string, from: string, to: string) {
  const text = _text.trim();
  const key = `${from}-${to}-${text}`;
  if (cache[key]) {
    return cache[key];
  }
  const result = await translate(text, { from, to });
  cache[key] = result;
  return result;
}
