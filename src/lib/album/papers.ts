export const WRITING_PAPERS = [
  "lined",
  "kraft",
  "letter",
  "grid",
  "deckle",
  "mint",
  "pink",
  "coffee",
  "ruled",
  "parchment",
] as const;

export type WritingPaper = (typeof WRITING_PAPERS)[number];

export function nextWritingPaper(current?: string): WritingPaper {
  const index = WRITING_PAPERS.indexOf((current as WritingPaper) ?? "lined");
  return WRITING_PAPERS[(index + 1) % WRITING_PAPERS.length] ?? "lined";
}
