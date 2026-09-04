import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

export type ChecklistItem = {
  id: string;
  category: "readiness" | "risk" | "value" | "governance";
  question: string;
  evidence_hint: string;
  checked: boolean;
};

type StageOutput = {
  stage_number: number;
  content: string | null;
  pending_items: unknown;
};

const CHECKLIST_TOOL: Anthropic.Tool = {
  name: "report_gate_checklist",
  description:
    "게이트 리뷰에 사용할 체크리스트 항목을 구조화된 형식으로 보고합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "items"],
    properties: {
      summary: {
        type: "string",
        description:
          "이번 게이트에서 검토자가 반드시 확인해야 할 핵심을 3-5문장으로 요약. 한국어.",
      },
      items: {
        type: "array",
        minItems: 6,
        maxItems: 14,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "question", "evidence_hint"],
          properties: {
            category: {
              type: "string",
              enum: ["readiness", "risk", "value", "governance"],
              description:
                "readiness(실행 준비도) · risk(위험) · value(가치) · governance(조직/책임)",
            },
            question: {
              type: "string",
              description:
                "검토자가 예/아니오 또는 짧은 답으로 판정할 질문. 한국어 1문장.",
            },
            evidence_hint: {
              type: "string",
              description:
                "이 항목을 판정하는 데 필요한 증거·산출물·문서를 짧게 명시. 한국어.",
            },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `당신은 제조혁신·AI 도입 컨설턴트다. 지금까지 진행된 5개 PBL 단계 산출물을 근거로, 이 과제가 실제 개발/도입에 진입해도 될지 검토하는 게이트 체크리스트를 만든다.

원칙:
- 검토자가 5분 안에 판정할 수 있게 항목은 명확하고 구체적이어야 한다.
- 각 항목은 예/아니오, 또는 짧은 문장으로 답할 수 있어야 한다.
- 4개 카테고리(readiness · risk · value · governance)를 골고루 포함한다.
- 산출물에 남아 있는 pending_items나 미해결 이슈는 반드시 체크리스트로 이어져야 한다.
- 이해관계자·의사결정 책임·롤백 시나리오·데이터 라이센스·개인정보 등은 governance/risk에 포함한다.
- report_gate_checklist 도구를 정확히 한 번 호출하여 응답한다.`;

export async function generateGateChecklist(
  outputs: StageOutput[],
): Promise<{ summary: string; items: ChecklistItem[] }> {
  const client = getAnthropicClient();

  const dump = outputs
    .sort((a, b) => a.stage_number - b.stage_number)
    .map((o) => {
      const pending = Array.isArray(o.pending_items)
        ? (o.pending_items as unknown[]).map(String)
        : [];
      return [
        `## Stage ${o.stage_number} 산출물`,
        o.content ?? "(빈 산출물)",
        pending.length > 0
          ? `\n**미해결 이슈:**\n${pending.map((p) => `- ${p}`).join("\n")}`
          : "",
      ].join("\n");
    })
    .join("\n\n");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools: [CHECKLIST_TOOL],
    tool_choice: { type: "tool", name: "report_gate_checklist" },
    messages: [
      {
        role: "user",
        content: `아래는 이 과제의 Stage 1-5 산출물이다. 이 근거로만 게이트 체크리스트를 생성하라.\n\n${dump}`,
      },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "report_gate_checklist",
  );
  if (!toolBlock) {
    throw new Error("체크리스트 도구 호출이 반환되지 않았습니다.");
  }

  const raw = toolBlock.input as {
    summary: string;
    items: Omit<ChecklistItem, "id" | "checked">[];
  };

  return {
    summary: raw.summary,
    items: raw.items.map((it, idx) => ({
      id: `chk-${idx + 1}`,
      category: it.category,
      question: it.question,
      evidence_hint: it.evidence_hint,
      checked: false,
    })),
  };
}
