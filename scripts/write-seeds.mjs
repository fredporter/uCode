// One-shot helper: transform a browser-baked atlas result (the JSON object
// returned by the Playwright bake call) into the committed seed JSON files.
// Usage: node write-seeds.mjs <bake-result.json>
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src) {
  console.error("usage: node write-seeds.mjs <bake-result.json>");
  process.exit(1);
}

let raw = readFileSync(src, "utf8");
// The bake result may be wrapped with a "Result: " prefix by the tool runner.
const brace = raw.indexOf("{");
if (brace > 0) raw = raw.slice(brace);
const obj = JSON.parse(raw);
const sext = JSON.parse(obj.sextants);
const term = JSON.parse(obj.terminalAtlas);
const tele = JSON.parse(obj.teletextAtlas);

const targets = [
  resolve(__dirname, "../seeds/gridcore"),
  resolve(__dirname, "../../uCore/frontend-vue/src/grid-core/seeds"),
];

for (const base of targets) {
  mkdirSync(base, { recursive: true });
  writeFileSync(`${base}/sextant-patterns.json`, JSON.stringify(sext, null, 2));
  writeFileSync(
    `${base}/glyph-atlas.terminal.json`,
    JSON.stringify(term, null, 2),
  );
  writeFileSync(
    `${base}/glyph-atlas.teletext.json`,
    JSON.stringify(tele, null, 2),
  );
  console.log(
    `wrote ${base} — terminal=${Object.keys(term.glyphs).length} teletext=${Object.keys(tele.glyphs).length} sextants=${Object.keys(sext.patterns).length}`,
  );
}
