import { describe, it, expect } from "vitest";
import { safeFilename } from "./safe-filename";

describe("safeFilename", () => {
  it("keeps ASCII letters, digits, and _.-", () => {
    expect(safeFilename("report_v1-final.pdf")).toBe("report_v1-final.pdf");
  });

  it("keeps Korean and other Unicode letters", () => {
    expect(safeFilename("현장사진.jpg")).toBe("현장사진.jpg");
    expect(safeFilename("데이터 v2.xlsx")).toBe("데이터_v2.xlsx");
  });

  it("replaces slashes and backslashes with underscore", () => {
    expect(safeFilename("a/b\\c.txt")).toBe("a_b_c.txt");
  });

  it("collapses runs of whitespace into single underscore", () => {
    expect(safeFilename("  hello   world  ")).toBe("hello_world");
  });

  it("strips special punctuation not in the allowlist", () => {
    expect(safeFilename("file!@#$%^&*()+={}[].pdf")).toBe("file.pdf");
  });

  it("caps the length at 80 characters", () => {
    const long = "a".repeat(200) + ".txt";
    const out = safeFilename(long);
    expect(out.length).toBe(80);
    expect(out.startsWith("a")).toBe(true);
  });

  it('returns "file" when nothing usable remains', () => {
    expect(safeFilename("")).toBe("file");
    expect(safeFilename("   ")).toBe("file");
    expect(safeFilename("!!!@@@")).toBe("file");
  });
});
