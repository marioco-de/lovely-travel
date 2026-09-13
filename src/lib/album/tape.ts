export const TAPE_STYLES = [
  "kraft",
  "plaid",
  "mint",
  "coral",
  "lagoon",
  "ink",
  "dots",
  "hatch",
  "grid",
  "floral",
  "cream",
  "olive",
  "burgundy",
  "gold",
  "sheer",
  "airmail",
  "gingham",
  "torn",
  "vellum",
  "azulejo",
] as const;

export type TapeStyle = (typeof TAPE_STYLES)[number];

export function tapeFor(seed: string, salt = 0): TapeStyle {
  let hash = salt + 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return TAPE_STYLES[Math.abs(hash) % TAPE_STYLES.length] ?? "kraft";
}
