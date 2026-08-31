import { describe, expect, it } from "vitest";
import { codePointsOf, graphemeId, segmentGraphemes, toGrapheme } from "../src/characters";
import { createBuffer, writeBufferString } from "../src/buffer";

describe("GridCore grapheme model", () => {
  it("keeps joined emoji as one visible character", () => {
    const [family] = segmentGraphemes("👩‍👩‍👧‍👦");
    expect(family.text).toBe("👩‍👩‍👧‍👦");
    expect(family.codePoints).toContain(0x200d);
  });

  it("normalizes equivalent text and creates stable sequence IDs", () => {
    expect(toGrapheme("e\u0301").text).toBe("é");
    expect(graphemeId("👍🏽")).toBe("U+1F44D-U+1F3FD");
  });

  it("iterates Unicode code points rather than UTF-16 code units", () => {
    expect(codePointsOf("A😀")).toEqual([0x41, 0x1f600]);
  });

  it("writes one visible grapheme into one grid cell", () => {
    const buffer = writeBufferString(createBuffer(3, 1), 0, 0, "A👩‍💻B");
    expect(buffer[0].map((cell) => cell.char)).toEqual(["A", "👩‍💻", "B"]);
  });
});
