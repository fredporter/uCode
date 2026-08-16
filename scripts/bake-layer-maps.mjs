// Bake layer-map seeds (ucode-layer-map-v1) from Natural Earth land polygons
// and procedural generators.
//
//   world-map.json  — equirectangular world, 40×25 gcells (80×75 sextant px)
//   region.json     — Australia crop (re-projected from the same polygons)
//   moon.json       — procedural lunar disk with craters
//
// Usage: node scripts/bake-layer-maps.mjs [path-to-ne_110m_land.geojson]

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GEOJSON_PATH = process.argv[2] || "/tmp/ne_110m_land.geojson";

// ── Sextant helpers ──────────────────────────────────────────────
// Sub-cell (sx, sy): sx ∈ {0,1} (left/right), sy ∈ {0,1,2} (top/mid/bottom).
// Bit order: bit0=TL bit1=TR bit2=ML bit3=MR bit4=BL bit5=BR.
function subBit(sx, sy) {
  return sy * 2 + sx;
}

// ── Geometry: point-in-polygon (even-odd) across many rings ──────
function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > py !== yj > py) {
      const xInt = ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (px < xInt) inside = !inside;
    }
  }
  return inside;
}

/** Flatten a Polygon/MultiPolygon into rings with bounding boxes. */
function extractRings(features) {
  const rings = [];
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    const polys =
      geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates || [];
    for (const poly of polys) {
      for (const ring of poly) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        rings.push({ ring, minX, maxX, minY, maxY });
      }
    }
  }
  return rings;
}

function isLand(rings, lon, lat) {
  let inside = false;
  for (const r of rings) {
    if (lon < r.minX || lon > r.maxX || lat < r.minY || lat > r.maxY) continue;
    if (pointInRing(lon, lat, r.ring)) inside = !inside;
  }
  return inside;
}

// ── Rasterise land → sextant cells ───────────────────────────────
function rasterizeLand(rings, bounds, cols, rows) {
  const { latMin, latMax, lonMin, lonMax } = bounds;
  const cellW = (lonMax - lonMin) / cols;
  const cellH = (latMax - latMin) / rows;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lon0 = lonMin + c * cellW;
      const lat0 = latMax - r * cellH;
      let pattern = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const lon = lon0 + ((sx + 0.5) * cellW) / 2;
          const lat = lat0 - ((sy + 0.5) * cellH) / 3;
          if (isLand(rings, lon, lat)) pattern |= 1 << subBit(sx, sy);
        }
      }
      // Patterns 61/62 ("all but one corner") have no Unicode codepoint;
      // snap them to the full block so coastlines stay solid.
      if (pattern === 61 || pattern === 62) pattern = 63;
      if (pattern !== 0) cells.push({ col: c, row: r, pattern });
    }
  }
  return cells;
}

// ── Procedural moon ──────────────────────────────────────────────
function rasterizeMoon(cols, rows) {
  const craters = [
    { x: 0.38, y: 0.38, rad: 0.09 },
    { x: 0.66, y: 0.3, rad: 0.06 },
    { x: 0.6, y: 0.62, rad: 0.08 },
    { x: 0.3, y: 0.66, rad: 0.05 },
    { x: 0.48, y: 0.48, rad: 0.04 },
  ];
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (c + 0.5) / cols;
      const py = (r + 0.5) / rows;
      const d = Math.hypot(px - 0.5, py - 0.5);
      if (d > 0.46) continue; // outside the disk
      // Craters carve out the surface.
      const inCrater = craters.some(
        (cr) => Math.hypot(px - cr.x, py - cr.y) < cr.rad,
      );
      const pattern = inCrater ? 0 : 63; // full block; craters empty
      if (pattern !== 0) cells.push({ col: c, row: r, pattern });
    }
  }
  return cells;
}

// ── Build a layer-map document ───────────────────────────────────
function buildMap(name, bounds, cols, rows, layers) {
  return {
    format: "ucode-layer-map-v1",
    name,
    projection: "equirectangular",
    bounds,
    cols,
    rows,
    layers,
  };
}

// ── Generate ─────────────────────────────────────────────────────
const geojson = JSON.parse(readFileSync(GEOJSON_PATH, "utf8"));
const rings = extractRings(geojson.features);

const worldCells = rasterizeLand(
  rings,
  { latMin: -60, latMax: 85, lonMin: -180, lonMax: 180 },
  40,
  25,
);
const worldMap = buildMap(
  "World Map",
  { latMin: -60, latMax: 85, lonMin: -180, lonMax: 180 },
  40,
  25,
  [{ id: "terrain", name: "Terrain", colour: 2, cells: worldCells }],
);

const regionCells = rasterizeLand(
  rings,
  { latMin: -45, latMax: -10, lonMin: 110, lonMax: 155 },
  40,
  25,
);
const regionMap = buildMap(
  "Region — Australia",
  { latMin: -45, latMax: -10, lonMin: 110, lonMax: 155 },
  40,
  25,
  [{ id: "terrain", name: "Terrain", colour: 2, cells: regionCells }],
);

const moonCells = rasterizeMoon(40, 25);
const moonMap = buildMap(
  "Moon",
  { latMin: -90, latMax: 90, lonMin: -180, lonMax: 180 },
  40,
  25,
  [{ id: "terrain", name: "Mare", colour: 7, cells: moonCells }],
);

// ── Write ────────────────────────────────────────────────────────
const targets = [
  resolve(__dirname, "../seeds/gridcore/layers"),
  resolve(__dirname, "../../uCore/frontend-vue/src/grid-core/seeds/layers"),
];
const outputs = [
  ["world-map.json", worldMap],
  ["region.json", regionMap],
  ["moon.json", moonMap],
];
for (const base of targets) {
  mkdirSync(base, { recursive: true });
  for (const [name, doc] of outputs) {
    writeFileSync(`${base}/${name}`, JSON.stringify(doc, null, 2) + "\n");
  }
  console.log(
    `wrote ${base} — world=${worldCells.length} cells, region=${regionCells.length}, moon=${moonCells.length}`,
  );
}
