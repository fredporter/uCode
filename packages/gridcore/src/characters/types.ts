import type { Grapheme } from "./grapheme";

export type CharacterAssetKind =
  | "glyph"
  | "icon"
  | "symbol"
  | "emoji"
  | "teletext-mosaic"
  | "sprite"
  | "bob";

export interface GlyphMetrics {
  width: number;
  height: number;
  baseline?: number;
  advance?: number;
}

export interface GlyphRef {
  id: string;
  kind: CharacterAssetKind;
  grapheme?: Grapheme;
  family?: string;
  metrics: GlyphMetrics;
  tags?: string[];
}

export interface MosaicPattern {
  bits: number;
  separated: boolean;
}

export interface AssetRef {
  id: string;
  kind: CharacterAssetKind;
  version: number;
  provenance?: string;
}
