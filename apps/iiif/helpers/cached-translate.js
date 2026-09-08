const cache = {};
export async function cachedTranslate(
  _text,
  from,
  to,
  request = globalThis.fetch,
) {
  const text = _text.trim();
  const key = `${from}-${to}-${text}`;
  if (cache[key]) {
    return cache[key];
  }
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({
    client: "gtx",
    sl: from,
    tl: to,
    dt: "t",
    q: text,
  }).toString();
  const response = await request(url);
  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status})`);
  }
  const json = await response.json();
  const result = json?.[0]
    ?.map((part) => part?.[0])
    .filter(Boolean)
    .join("");
  if (!result) {
    throw new Error("Translation not found");
  }
  cache[key] = result;
  return result;
}
