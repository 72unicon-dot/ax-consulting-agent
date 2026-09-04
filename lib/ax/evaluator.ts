import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

export type AxEvaluation = {
  score_effect: number;
  score_feasibility: number;
  score_data: number;
  score_risk: number;
  score_scalability: number;
  total_score: number;
  reason_effect: string;
  reason_feasibility: string;
  reason_data: string;
  reason_risk: string;
  reason_scalability: string;
  recommendation: string;
  path_suggestion: "rule" | "ai" | "review_needed";
};

export type TaskInput = {
  title: string;
  description: string | null;
  background: string | null;
  expected_effect: string | null;
};

const SYSTEM_PROMPT = `당신은 제조혁신·AI 도입 컨설턴트다. 고객사가 등록한 과제(문제)를 5개 축으로 평가하고, 다음 실행 경로를 판정한다.

평가 축(각 0-20점):
1) 효과(effect): 비즈니스 임팩트, 정량/정성 효과의 크기와 확실성
2) 실현가능성(feasibility): 현재 조직 역량, 기술 성숙도, 필요 자원 대비 실행 난이도
3) 데이터(data): 이 과제를 데이터 기반으로 풀 수 있는 정도(데이터 유무·품질·라벨링·양)
4) 리스크(risk): 규제/개인정보/윤리/의사결정 오류 리스크. 리스크가 낮을수록 높은 점수를 준다(20=매우 안전, 0=매우 위험)
5) 확장성(scalability): 다른 라인/공장/부서로 확장 가능성

경로 판정 규칙:
- rule: 규칙 기반(자동화/RPA/워크플로우 재설계)만으로 충분. AI가 불필요하거나 과잉.
- ai: 학습/추론이 실질 가치를 만드는 과제(예측/분류/이상탐지/생성 등).
- review_needed: 정보 부족·정의 모호·이해관계 불명확 → 추가 진단 필요.

산출 규칙:
- 모든 점수는 0-20의 정수. total_score는 5개 점수의 단순 합(0-100).
- 각 근거(reason_*)는 한국어 1-2문장. 근거는 구체적 사실·가정에 기반.
- recommendation은 3-5문장 한국어. "다음 단계로 무엇을 해야 하는가"를 실행 관점에서 명시.
- 정보가 부족하면 억지로 확신하지 말고, reason과 recommendation에서 필요한 추가 정보를 명시하고 path_suggestion을 review_needed로 둔다.`;

const AX_TOOL: Anthropic.Tool = {
  name: "report_ax_evaluation",
  description: "AX 평가 결과를 구조화된 형식으로 보고합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "score_effect",
      "score_feasibility",
      "score_data",
      "score_risk",
      "score_scalability",
      "total_score",
      "reason_effect",
      "reason_feasibility",
      "reason_data",
      "reason_risk",
      "reason_scalability",
      "recommendation",
      "path_suggestion",
    ],
    properties: {
      score_effect: { type: "integer", minimum: 0, maximum: 20 },
      score_feasibility: { type: "integer", minimum: 0, maximum: 20 },
      score_data: { type: "integer", minimum: 0, maximum: 20 },
      score_risk: { type: "integer", minimum: 0, maximum: 20 },
      score_scalability: { type: "integer", minimum: 0, maximum: 20 },
      total_score: { type: "integer", minimum: 0, maximum: 100 },
      reason_effect: { type: "string" },
      reason_feasibility: { type: "string" },
      reason_data: { type: "string" },
      reason_risk: { type: "string" },
      reason_scalability: { type: "string" },
      recommendation: { type: "string" },
      path_suggestion: { type: "string", enum: ["rule", "ai", "review_needed"] },
    },
  },
};

export async function evaluateTask(task: TaskInput): Promise<AxEvaluation> {
  const client = getAnthropicClient();

  const userMessage = [
    `# 과제 정보`,
    `- 제목: ${task.title}`,
    `- 설명: ${task.description ?? "(없음)"}`,
    `- 배경: ${task.background ?? "(없음)"}`,
    `- 기대 효과: ${task.expected_effect ?? "(없음)"}`,
    ``,
    `위 정보를 바탕으로 report_ax_evaluation 도구를 정확히 한 번 호출하여 평가 결과를 보고하시오.`,
  ].join("\n");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools: [AX_TOOL],
    tool_choice: { type: "tool", name: "report_ax_evaluation" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "report_ax_evaluation",
  );
  if (!toolBlock) {
    throw new Error("평가 도구 호출이 반환되지 않았습니다.");
  }

  const raw = toolBlock.input as AxEvaluation;

  const computedTotal =
    raw.score_effect +
    raw.score_feasibility +
    raw.score_data +
    raw.score_risk +
    raw.score_scalability;

  return { ...raw, total_score: computedTotal };
}
