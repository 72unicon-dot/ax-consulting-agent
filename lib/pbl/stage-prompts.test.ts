import { describe, it, expect } from "vitest";
import { STAGE_META, getStageSystemPrompt } from "./stage-prompts";

const SAMPLE_TASK = {
  title: "재고 실사 편차 자동 알림",
  description: "월말 실사 결과 편차가 크다",
  background: "물류센터 A에서 발생",
  expected_effect: "편차 30% 감소",
  ax_path: "ai",
};

describe("STAGE_META", () => {
  it("has exactly 5 stages", () => {
    expect(Object.keys(STAGE_META)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("each stage has title, subtitle, outputType", () => {
    for (const stage of [1, 2, 3, 4, 5] as const) {
      const meta = STAGE_META[stage];
      expect(meta.title).toMatch(/Stage \d/);
      expect(meta.subtitle.length).toBeGreaterThan(0);
      expect(meta.outputType.length).toBeGreaterThan(0);
    }
  });
});

describe("getStageSystemPrompt", () => {
  it("includes the task metadata and the stage identity", () => {
    const p = getStageSystemPrompt(1, SAMPLE_TASK);
    expect(p).toContain(SAMPLE_TASK.title);
    expect(p).toContain(SAMPLE_TASK.description);
    expect(p).toContain(SAMPLE_TASK.background);
    expect(p).toContain(SAMPLE_TASK.expected_effect);
    expect(p).toContain(SAMPLE_TASK.ax_path);
    expect(p).toContain("Stage 1");
  });

  it("emits '(없음)' placeholders when optional fields are null", () => {
    const p = getStageSystemPrompt(2, {
      title: "T",
      description: null,
      background: null,
      expected_effect: null,
      ax_path: null,
    });
    expect(p).toContain("(없음)");
    expect(p).toContain("미판정");
  });

  it("swaps the stage-specific persona per stage", () => {
    // Stage 1 must mention 문제 정의; Stage 5 must mention 로드맵.
    const s1 = getStageSystemPrompt(1, SAMPLE_TASK);
    const s5 = getStageSystemPrompt(5, SAMPLE_TASK);
    expect(s1).toContain("문제 정의");
    expect(s5).toContain("로드맵");
  });
});
