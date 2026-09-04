import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { STAGE_META, type StageNumber } from "./stage-prompts";
import type Anthropic from "@anthropic-ai/sdk";

export type StageOutput = {
  title: string;
  content: string;
  pending_items: string[];
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const FINALIZE_TOOL: Anthropic.Tool = {
  name: "report_stage_output",
  description: "단계 산출물을 구조화된 형식으로 최종 정리하여 보고합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "content", "pending_items"],
    properties: {
      title: {
        type: "string",
        description: "산출물의 제목. 한국어. 예: '문제 정의 초안 v1'",
      },
      content: {
        type: "string",
        description:
          "본문. 마크다운 허용. 항목/불릿을 활용해 이해관계자가 곧바로 읽을 수 있게 구조화한다. 500-1500자.",
      },
      pending_items: {
        type: "array",
        items: { type: "string" },
        description: "이 산출물에서 아직 확답되지 않은 미해결 이슈. 없으면 빈 배열.",
      },
    },
  },
};

const STAGE_FINALIZE_INSTRUCTIONS: Record<StageNumber, string> = {
  1: "지금까지 대화를 바탕으로 '문제 정의' 최종 초안을 정리한다. 4가지 축(① 현재 문제 ② 지금 중요한 이유 ③ 이전 시도와 실패 원인 ④ 성공 정의)이 모두 담기도록 한다.",
  2: "지금까지 대화를 바탕으로 '데이터·프로세스 진단' 최종 초안을 정리한다. as-is 프로세스, 데이터 자산과 부족분, 이해관계자, 리스크가 모두 담기도록 한다.",
  3: "지금까지 대화를 바탕으로 '솔루션 설계' 최종 초안을 정리한다. 선택한 접근과 대안, 각 대안의 트레이드오프, 결정의 근거를 명시한다.",
  4: "지금까지 대화를 바탕으로 'PoC 계획' 최종 초안을 정리한다. 검증할 가정, 성공/실패 기준(정량), 필요한 데이터·인원·기간·예산을 명시한다.",
  5: "지금까지 대화를 바탕으로 '실행 로드맵' 최종 초안을 정리한다. 마일스톤, 5카테고리 KPI, 리스크와 완화책, 조직/거버넌스를 명시한다.",
};

export async function finalizeStage(
  stage: StageNumber,
  history: ChatMessage[],
): Promise<StageOutput> {
  if (history.length === 0) {
    throw new Error("빈 대화에서 산출물을 만들 수 없습니다.");
  }

  const client = getAnthropicClient();

  const system = [
    "당신은 제조혁신·AI 도입 컨설턴트다.",
    `단계: ${STAGE_META[stage].title}`,
    "",
    STAGE_FINALIZE_INSTRUCTIONS[stage],
    "",
    "- 사용자와 어시스턴트가 이미 확인한 사실만 담는다. 추측을 새로 만들지 않는다.",
    "- 아직 답이 없거나 확인되지 않은 항목은 pending_items 배열에 넣는다.",
    "- report_stage_output 도구를 정확히 한 번 호출하여 응답한다.",
  ].join("\n");

  const conversationDump = history
    .map(
      (m) =>
        `--- ${m.role === "user" ? "사용자" : "컨설턴트"} ---\n${m.content}`,
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system,
    tools: [FINALIZE_TOOL],
    tool_choice: { type: "tool", name: "report_stage_output" },
    messages: [
      {
        role: "user",
        content: `아래는 이 단계의 전체 대화 기록이다. 이 기록만을 근거로 산출물을 정리하라.\n\n${conversationDump}`,
      },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "report_stage_output",
  );
  if (!toolBlock) {
    throw new Error("정리 도구 호출이 반환되지 않았습니다.");
  }

  return toolBlock.input as StageOutput;
}
