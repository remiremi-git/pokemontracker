const FORM_SUFFIX_PATTERN =
  /\s*\((?:move|attack|ability|anime|manga|tcg|contest|pok[eé]mon)\)\s*$/i;

export function normalizeLookupName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(FORM_SUFFIX_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
