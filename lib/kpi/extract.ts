import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import type Anthropic from "@anthropic-ai/sdk";

export type KpiCategory = "business" | "ai" | "system" | "cost" | "adoption";

export type ExtractedKpi = {
  category: KpiCategory;
  name: string;
  baseline: number | null;
  target: number | null;
  unit: string;
};

type StageOutputRow = {
  stage_number: number;
  content: string | null;
};

const KPI_TOOL: Anthropic.Tool = {
  name: "report_kpis",
  description: "이 과제의 핵심 KPI를 카테고리별로 정리하여 보고합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["kpis"],
    properties: {
      kpis: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "name", "unit", "baseline", "target"],
          properties: {
            category: {
              type: "string",
              enum: ["business", "ai", "system", "cost", "adoption"],
              description:
                "business(사업 성과) · ai(모델/추론 품질) · system(운영) · cost(비용) · adoption(도입/사용)",
            },
            name: {
              type: "string",
              description: "KPI 이름. 한국어. 짧고 명확히. 예: '실사 오차율'",
            },
            unit: {
              type: "string",
              description: "단위. 예: '%', '건/일', 'ms', '원', 'MAU'",
            },
            baseline: {
              type: ["number", "null"],
              description:
                "현재(as-is) 수치. 산출물에 없다면 null. 임의 값을 만들어내지 않는다.",
            },
            target: {
              type: ["number", "null"],
              description:
                "목표(to-be) 수치. 산출물에 없다면 null. 임의 값을 만들어내지 않는다.",
            },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `당신은 제조혁신·AI 도입 컨설턴트다. 아래 5단계 산출물에서 이 과제의 성공을 정량으로 측정할 KPI를 추출한다.

원칙:
- 5개 카테고리(business/ai/system/cost/adoption) 각각에서 최소 1개는 뽑는다(가능한 경우).
- baseline/target은 산출물에 명시된 숫자만 사용한다. 없다면 null로 두고 만들어내지 않는다.
- 단위(unit)는 반드시 명시한다.
- KPI 이름은 한국어 8자 이내가 이상적이다.
- report_kpis 도구를 정확히 한 번 호출한다.`;

export async function extractKpisFromOutputs(
  outputs: StageOutputRow[],
): Promise<ExtractedKpi[]> {
  if (outputs.length === 0) {
    throw new Error("산출물이 없어 KPI를 추출할 수 없습니다.");
  }

  const client = getAnthropicClient();

  const dump = outputs
    .sort((a, b) => a.stage_number - b.stage_number)
    .map((o) => {
      const meta = STAGE_META[o.stage_number as StageNumber];
      return [
        `## ${meta?.title ?? `Stage ${o.stage_number}`}`,
        o.content ?? "(빈 산출물)",
      ].join("\n");
    })
    .join("\n\n");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools: [KPI_TOOL],
    tool_choice: { type: "tool", name: "report_kpis" },
    messages: [
      {
        role: "user",
        content: `아래는 이 과제의 Stage 산출물이다.\n\n${dump}`,
      },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "report_kpis",
  );
  if (!toolBlock) {
    throw new Error("KPI 도구 호출이 반환되지 않았습니다.");
  }

  const raw = toolBlock.input as { kpis: ExtractedKpi[] };
  return raw.kpis;
}
