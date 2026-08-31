export interface Grapheme {
  text: string;
  codePoints: number[];
  id: string;
}

export function codePointsOf(text: string): number[] {
  return Array.from(text, (character) => character.codePointAt(0) ?? 0);
}

export function graphemeId(text: string): string {
  return codePointsOf(text)
    .map((codePoint) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`)
    .join("-");
}

export function toGrapheme(text: string): Grapheme {
  const normalized = text.normalize("NFC");
  return { text: normalized, codePoints: codePointsOf(normalized), id: graphemeId(normalized) };
}

export function segmentGraphemes(text: string): Grapheme[] {
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: "grapheme" },
      ) => { segment(value: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  const segments = Segmenter
    ? Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (item) => item.segment)
    : Array.from(text);
  return segments.map(toGrapheme);
}
