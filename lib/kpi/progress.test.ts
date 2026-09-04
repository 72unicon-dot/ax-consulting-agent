import { describe, it, expect } from "vitest";
import { computeProgress } from "./progress";

describe("computeProgress", () => {
  it("returns null when any of baseline/current/target is missing", () => {
    expect(computeProgress(null, 50, 100)).toBeNull();
    expect(computeProgress(0, null, 100)).toBeNull();
    expect(computeProgress(0, 50, null)).toBeNull();
  });

  it("returns 0 at baseline and 100 at target for an ascending KPI", () => {
    expect(computeProgress(0, 0, 100)).toBe(0);
    expect(computeProgress(0, 100, 100)).toBe(100);
    expect(computeProgress(0, 50, 100)).toBe(50);
  });

  it("returns 0 at baseline and 100 at target for a descending KPI", () => {
    // Defect rate: baseline 10, target 2 (want it lower)
    expect(computeProgress(10, 10, 2)).toBe(0);
    expect(computeProgress(10, 2, 2)).toBe(100);
    expect(computeProgress(10, 6, 2)).toBe(50);
  });

  it("clamps below baseline to 0", () => {
    // Ascending: current lower than baseline
    expect(computeProgress(50, 10, 100)).toBe(0);
    // Descending: current higher than baseline (worse)
    expect(computeProgress(10, 20, 2)).toBe(0);
  });

  it("clamps above target to 100", () => {
    // Ascending: overshot the target
    expect(computeProgress(0, 200, 100)).toBe(100);
    // Descending: overshot the target below
    expect(computeProgress(10, 0, 2)).toBe(100);
  });

  it("returns 100 when baseline===target and current equals both, else 0", () => {
    expect(computeProgress(50, 50, 50)).toBe(100);
    expect(computeProgress(50, 49, 50)).toBe(0);
  });
});
