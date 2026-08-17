import { describe, expect, it } from "vitest";
import {
  PIXEL_COLOURS,
  PIXEL_COUNT,
  PIXEL_HEIGHT,
  PIXEL_WIDTH,
  createPixelBuffer,
  fillPixelBuffer,
  getPixel,
  measureInkBounds,
  setPixel,
} from "../src/pixel/pixel-buffer";
import { PixelEditor } from "../src/pixel/pixel-editor";
import {
  gridBufferToPixelBuffer,
  pixelBufferToGridBuffer,
} from "../src/pixel/to-grid";

describe("pixel buffer", () => {
  it("creates a 24x24 buffer by default", () => {
    const buf = createPixelBuffer();
    expect(buf.length).toBe(PIXEL_COUNT);
    expect(buf[0]).toBe(0);
  });

  it("creates variable-dimension buffers", () => {
    const buf = createPixelBuffer(0, 24, 40);
    expect(buf.length).toBe(24 * 40);
  });

  it("setPixel / getPixel round-trip with bounds", () => {
    const buf = createPixelBuffer();
    setPixel(buf, 3, 4, 5);
    expect(getPixel(buf, 3, 4)).toBe(5);
    expect(getPixel(buf, 0, 0)).toBe(0);

    setPixel(buf, -1, 0, 3);
    setPixel(buf, PIXEL_WIDTH, PIXEL_HEIGHT, 3);
    expect(getPixel(buf, 0, 0)).toBe(0);
  });

  it("fills the buffer", () => {
    const buf = createPixelBuffer();
    fillPixelBuffer(buf, 7);
    expect(buf[0]).toBe(7);
    expect(buf[PIXEL_COUNT - 1]).toBe(7);
  });

  it("measures ink bounds", () => {
    const buf = createPixelBuffer();
    setPixel(buf, 3, 4, 1);
    setPixel(buf, 5, 6, 1);
    expect(measureInkBounds(buf)).toEqual({
      minX: 3,
      minY: 4,
      maxX: 5,
      maxY: 6,
    });
    expect(measureInkBounds(createPixelBuffer())).toBeNull();
  });
});

describe("PixelEditor", () => {
  it("paints, erases, fills, clears with undo/redo", () => {
    const e = new PixelEditor();
    e.setColor(3);
    e.paint(0, 0);
    expect(e.buffer[0]).toBe(3);

    e.undo();
    expect(e.buffer[0]).toBe(0);

    e.redo();
    expect(e.buffer[0]).toBe(3);

    e.fill(5);
    expect(e.buffer[0]).toBe(5);

    e.undo();
    expect(e.buffer[0]).toBe(3);

    e.clear();
    expect(e.buffer[PIXEL_COUNT - 1]).toBe(0);
  });

  it("flood-fills a connected region", () => {
    const e = new PixelEditor();
    e.setColor(5);
    e.paint(0, 0);
    e.setColor(2);
    e.floodFill(0, 0);
    expect(e.buffer[0]).toBe(2);
  });

  it("clamps colour to the 32-colour palette", () => {
    const e = new PixelEditor();
    e.setColor(99);
    expect(e.getColor()).toBe(PIXEL_COLOURS - 1);
  });
});

describe("pixel ⇄ grid buffer conversion", () => {
  it("maps each pixel to a solid-colour cell", () => {
    const buf = createPixelBuffer();
    setPixel(buf, 1, 0, 4);
    const grid = pixelBufferToGridBuffer(buf);
    expect(grid.length).toBe(PIXEL_HEIGHT);
    expect(grid[0].length).toBe(PIXEL_WIDTH);
    expect(grid[0][1].fg).toBe(4);
    expect(grid[0][1].bg).toBe(4);
  });

  it("round-trips through a grid buffer", () => {
    const buf = createPixelBuffer();
    setPixel(buf, 2, 3, 9);
    const back = gridBufferToPixelBuffer(pixelBufferToGridBuffer(buf));
    expect(getPixel(back, 2, 3)).toBe(9);
  });
});
