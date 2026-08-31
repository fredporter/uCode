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
import { MAX_PIXEL_ANIMATION_PIXELS, PixelAnimation } from "../src/pixel/pixel-animation";
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

  it("copies, pastes and flips pixel selections reversibly", () => {
    const e = new PixelEditor(createPixelBuffer(0, 4, 2), 4, 2);
    e.paint(0, 0, 2);
    e.paint(1, 0, 3);
    e.select(0, 0, 2, 1);
    e.flipSelection(true);
    expect(Array.from(e.buffer.slice(0, 2))).toEqual([3, 2]);
    e.copy();
    e.paste(2, 1);
    expect(Array.from(e.buffer.slice(6, 8))).toEqual([3, 2]);
    e.undo();
    expect(Array.from(e.buffer.slice(6, 8))).toEqual([0, 0]);
  });

  it("moves and rotates rectangular selections within the canvas", () => {
    const e = new PixelEditor(createPixelBuffer(0, 4, 4), 4, 4);
    e.paint(0, 0, 2);
    e.paint(1, 0, 3);
    e.select(0, 0, 2, 1);
    e.rotateSelection(true);
    expect(e.getSelection()).toMatchObject({ width: 1, height: 2 });
    expect([e.buffer[0], e.buffer[4]]).toEqual([2, 3]);
    e.moveSelection(2, 1);
    expect(e.getSelection()).toMatchObject({ x: 2, y: 1 });
    expect([e.buffer[6], e.buffer[10]]).toEqual([2, 3]);
  });
});

describe("PixelAnimation", () => {
  it("adds, duplicates, selects and deletes independent frames", () => {
    const first = createPixelBuffer(0, 2, 2);
    setPixel(first, 0, 0, 2, 2, 2);
    const animation = new PixelAnimation(first, 2, 2);
    animation.duplicate();
    const changed = animation.current().pixels;
    setPixel(changed, 1, 1, 3, 2, 2);
    animation.update(changed);
    expect(animation.length).toBe(2);
    expect(animation.previous()?.pixels[3]).toBe(0);
    animation.delete();
    expect(animation.length).toBe(1);
  });

  it("selects playback frames from their individual durations", () => {
    const animation = new PixelAnimation(createPixelBuffer(0, 1, 1), 1, 1, 100);
    animation.add();
    animation.setDuration(200);
    expect(animation.frameIndexAt(50)).toBe(0);
    expect(animation.frameIndexAt(150)).toBe(1);
    expect(animation.frameIndexAt(350)).toBe(0);
  });

  it("round-trips frame pixels, timing and active frame", () => {
    const first = createPixelBuffer(0, 2, 2);
    setPixel(first, 0, 0, 4, 2, 2);
    const animation = new PixelAnimation(first, 2, 2, 90);
    animation.add();
    const second = animation.current().pixels;
    setPixel(second, 1, 1, 7, 2, 2);
    animation.update(second);
    animation.setDuration(180);
    const restored = PixelAnimation.deserialize(JSON.parse(JSON.stringify(animation.serialize())));
    expect(restored.length).toBe(2);
    expect(restored.active).toBe(1);
    expect(restored.list().map(frame => frame.durationMs)).toEqual([90, 180]);
    expect(restored.list()[0].pixels[0]).toBe(4);
    expect(restored.list()[1].pixels[3]).toBe(7);
  });

  it("rejects unsupported animation versions", () => {
    expect(() => PixelAnimation.deserialize({
      format: 'ucode-pixel-animation-v1', version: 2, width: 1, height: 1, activeFrame: 0, frames: [],
    })).toThrow('Unsupported pixel animation version')
  })

  it("rejects partial frame pixels before allocating buffers", () => {
    expect(() => PixelAnimation.deserialize({
      format: 'ucode-pixel-animation-v1', version: 1, width: 2, height: 2, activeFrame: 0,
      frames: [{ name: 'partial', durationMs: 120, pixels: [0, 0, 0] }],
    })).toThrow('Invalid pixel frame 0')
  })

  it("rejects oversized dimensions without requiring pixel data", () => {
    expect(() => PixelAnimation.deserialize({
      format: 'ucode-pixel-animation-v1', version: 1, width: MAX_PIXEL_ANIMATION_PIXELS + 1, height: 1, activeFrame: 0,
      frames: [{}],
    })).toThrow(`Pixel animation frame exceeds ${MAX_PIXEL_ANIMATION_PIXELS} pixel limit`)
  })

  it("rejects documents exceeding the aggregate animation pixel budget", () => {
    expect(() => PixelAnimation.deserialize({
      format: 'ucode-pixel-animation-v1', version: 1, width: 1, height: 1, activeFrame: 0,
      frames: Array.from({ length: MAX_PIXEL_ANIMATION_PIXELS + 1 }, () => ({})),
    })).toThrow(`Pixel animation exceeds ${MAX_PIXEL_ANIMATION_PIXELS} pixel limit`)
  })
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
