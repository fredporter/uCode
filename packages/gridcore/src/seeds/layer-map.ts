/**
 * Layer Map — multi-layer seed dataset schema (ucode-layer-map-v1).
 *
 * A layer map is a grid of gcells (cols × rows), where each cell is a 6-bit
 * sextant pattern (2×3 sub-cells). Layers are sparse cell lists composed
 * bottom-up (terrain → details → entities). The bounds + equirectangular
 * projection let tools map cell coords to lat/lon and vice-versa.
 *
 * @see seeds/gridcore/layers/*.json
 * @see load-layer-map.ts
 */

/** Geographic bounds of the map (equirectangular projection). */
export interface LayerMapBounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/** A single sparse cell in a layer. */
export interface LayerMapCell {
  col: number;
  row: number;
  /** 6-bit sextant pattern (0-63); 0 = empty/transparent. */
  pattern: number;
  /** Optional foreground colour override (palette index 0-7). */
  fg?: number;
  /** Optional background colour override (palette index 0-7). */
  bg?: number;
}

/** A named layer of sparse cells. */
export interface LayerMapLayer {
  id: string;
  name: string;
  /** Default palette colour for this layer's cells. */
  colour: number;
  cells: LayerMapCell[];
}

/** A layer map document (ucode-layer-map-v1). */
export interface LayerMap {
  format: string;
  name: string;
  projection: string;
  bounds: LayerMapBounds;
  cols: number;
  rows: number;
  layers: LayerMapLayer[];
}

/** Predicate: is this a valid ucode-layer-map-v1 document? */
export function isLayerMap(value: unknown): value is LayerMap {
  if (typeof value !== "object" || value === null) return false;
  const map = value as Partial<LayerMap>;
  return (
    map.format === "ucode-layer-map-v1" &&
    typeof map.cols === "number" &&
    typeof map.rows === "number" &&
    Array.isArray(map.layers) &&
    !!map.bounds
  );
}

/** Map a gcell column to its centre longitude (equirectangular). */
export function colToLon(map: LayerMap, col: number): number {
  const { lonMin, lonMax } = map.bounds;
  return lonMin + ((col + 0.5) / map.cols) * (lonMax - lonMin);
}

/** Map a gcell row to its centre latitude (equirectangular). */
export function rowToLat(map: LayerMap, row: number): number {
  const { latMin, latMax } = map.bounds;
  return latMax - ((row + 0.5) / map.rows) * (latMax - latMin);
}

/** Map a longitude to the nearest gcell column. */
export function lonToCol(map: LayerMap, lon: number): number {
  const { lonMin, lonMax } = map.bounds;
  return Math.floor(((lon - lonMin) / (lonMax - lonMin)) * map.cols);
}

/** Map a latitude to the nearest gcell row. */
export function latToRow(map: LayerMap, lat: number): number {
  const { latMin, latMax } = map.bounds;
  return Math.floor(((latMax - lat) / (latMax - latMin)) * map.rows);
}
