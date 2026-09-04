import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import type Anthropic from "@anthropic-ai/sdk";

type Task = {
  title: string;
  description: string | null;
  background: string | null;
  expected_effect: string | null;
  ax_path: string | null;
  ax_total_score: number | null;
};

type Company = { name: string; industry: string | null } | null;

type Evaluation = {
  score_effect: number | null;
  score_feasibility: number | null;
  score_data: number | null;
  score_risk: number | null;
  score_scalability: number | null;
  total_score: number | null;
  path_suggestion: string | null;
  recommendation: string | null;
  evaluated_at: string;
} | null;

type StageOutputRow = {
  stage_number: number;
  content: string | null;
  pending_items: unknown;
  version: number;
  updated_at: string;
};

type Gate = {
  gate_number: number;
  status: string;
  review_comment: string | null;
  reviewed_at: string | null;
  checklist: unknown;
} | null;

type ExecutiveSummary = {
  headline: string;
  key_findings: string[];
  risks: string[];
  recommended_next_steps: string[];
};

const EXEC_TOOL: Anthropic.Tool = {
  name: "report_executive_summary",
  description: "최종 보고서의 Executive Summary를 구조화된 형식으로 보고합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["headline", "key_findings", "risks", "recommended_next_steps"],
    properties: {
      headline: {
        type: "string",
        description: "1문장 헤드라인. '이 과제의 결론'을 한 줄로. 한국어.",
      },
      key_findings: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 6,
        description: "핵심 발견(정량 수치 포함) 3-6개. 각 항목 1문장. 한국어.",
      },
      risks: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
        description: "실행 전 반드시 관리해야 할 리스크 2-5개. 한국어.",
      },
      recommended_next_steps: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 5,
        description: "다음 30-90일 내 실행할 액션 3-5개. 한국어.",
      },
    },
  },
};

async function generateExecutiveSummary(
  task: Task,
  evaluation: Evaluation,
  outputs: StageOutputRow[],
  gate: Gate,
): Promise<ExecutiveSummary> {
  const client = getAnthropicClient();

  const dump = outputs
    .sort((a, b) => a.stage_number - b.stage_number)
    .map((o) => {
      const meta = STAGE_META[o.stage_number as StageNumber];
      const pending = Array.isArray(o.pending_items)
        ? (o.pending_items as unknown[]).map(String)
        : [];
      return [
        `## ${meta?.title ?? `Stage ${o.stage_number}`}`,
        o.content ?? "(빈 산출물)",
        pending.length > 0
          ? `\n**미해결 이슈:** ${pending.join(" / ")}`
          : "",
      ].join("\n");
    })
    .join("\n\n");

  const evalBlock = evaluation
    ? [
        "## AX 평가",
        `- 총점: ${evaluation.total_score}/100`,
        `- 경로: ${evaluation.path_suggestion?.toUpperCase()}`,
        `- 권고: ${evaluation.recommendation ?? ""}`,
      ].join("\n")
    : "";

  const gateBlock = gate
    ? [
        "## Gate 5 결과",
        `- 상태: ${gate.status}`,
        gate.review_comment ? `- 검토자 코멘트: ${gate.review_comment}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const system = `당신은 제조혁신·AI 도입 컨설턴트다. 이 과제의 진단 자료를 바탕으로 임원 대상 Executive Summary를 만든다.

원칙:
- 아래 자료에 근거해서만 작성한다. 새로운 사실을 만들어내지 않는다.
- 임원이 30초 안에 판단할 수 있도록 정량 수치를 우선 배치한다.
- 미해결 이슈와 반려 코멘트는 반드시 리스크에 반영한다.
- report_executive_summary 도구를 정확히 한 번 호출한다.`;

  const userContent = [
    "# 과제 정보",
    `- 제목: ${task.title}`,
    `- 배경: ${task.background ?? "(없음)"}`,
    `- 기대 효과: ${task.expected_effect ?? "(없음)"}`,
    "",
    evalBlock,
    "",
    dump,
    "",
    gateBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system,
    tools: [EXEC_TOOL],
    tool_choice: { type: "tool", name: "report_executive_summary" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "report_executive_summary",
  );
  if (!toolBlock) {
    throw new Error("Executive Summary 도구 호출이 반환되지 않았습니다.");
  }
  return toolBlock.input as ExecutiveSummary;
}

function fmt(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("ko-KR");
}

function assembleMarkdown({
  task,
  company,
  evaluation,
  outputs,
  gate,
  summary,
}: {
  task: Task;
  company: Company;
  evaluation: Evaluation;
  outputs: StageOutputRow[];
  gate: Gate;
  summary: ExecutiveSummary;
}): { title: string; content: string } {
  const now = new Date().toLocaleString("ko-KR");
  const title = `[AX Consulting] ${task.title} · 최종 보고서`;

  const sections: string[] = [];

  sections.push(`# ${title}`);
  sections.push(
    `발행일 ${now}${company?.name ? ` · 대상: ${company.name}${company.industry ? ` (${company.industry})` : ""}` : ""}`,
  );

  sections.push(`## 1. Executive Summary`);
  sections.push(`**${summary.headline}**`);
  sections.push(`### 핵심 발견`);
  sections.push(summary.key_findings.map((s) => `- ${s}`).join("\n"));
  sections.push(`### 리스크`);
  sections.push(summary.risks.map((s) => `- ${s}`).join("\n"));
  sections.push(`### 권고 다음 액션 (30–90일)`);
  sections.push(
    summary.recommended_next_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  );

  sections.push(`## 2. 과제 개요`);
  sections.push(
    [
      `- **제목**: ${task.title}`,
      `- **설명**: ${task.description ?? "(없음)"}`,
      `- **배경**: ${task.background ?? "(없음)"}`,
      `- **기대 효과**: ${task.expected_effect ?? "(없음)"}`,
    ].join("\n"),
  );

  if (evaluation) {
    sections.push(`## 3. AX 평가`);
    sections.push(
      [
        `- **총점**: ${evaluation.total_score}/100`,
        `- **경로 판정**: ${evaluation.path_suggestion?.toUpperCase()}`,
        `- **평가 시각**: ${fmt(evaluation.evaluated_at)}`,
        "",
        `| 축 | 점수 |`,
        `|---|---|`,
        `| 효과 | ${evaluation.score_effect ?? "—"}/20 |`,
        `| 실현가능성 | ${evaluation.score_feasibility ?? "—"}/20 |`,
        `| 데이터 | ${evaluation.score_data ?? "—"}/20 |`,
        `| 리스크 | ${evaluation.score_risk ?? "—"}/20 |`,
        `| 확장성 | ${evaluation.score_scalability ?? "—"}/20 |`,
      ].join("\n"),
    );
    if (evaluation.recommendation) {
      sections.push(`**권고**\n\n${evaluation.recommendation}`);
    }
  }

  sections.push(`## 4. PBL 단계별 산출물`);
  const sorted = [...outputs].sort((a, b) => a.stage_number - b.stage_number);
  for (const o of sorted) {
    const meta = STAGE_META[o.stage_number as StageNumber];
    sections.push(`### 4.${o.stage_number} ${meta?.title ?? `Stage ${o.stage_number}`} · v${o.version}`);
    sections.push(o.content?.trim() || "(빈 산출물)");
    const pending = Array.isArray(o.pending_items)
      ? (o.pending_items as unknown[]).map(String)
      : [];
    if (pending.length > 0) {
      sections.push(`**미해결 이슈**`);
      sections.push(pending.map((p) => `- ${p}`).join("\n"));
    }
    sections.push(`_최종 수정: ${fmt(o.updated_at)}_`);
  }

  if (gate) {
    sections.push(`## 5. Gate 5 검토 결과`);
    sections.push(
      [
        `- **상태**: ${gate.status}`,
        `- **검토 시각**: ${fmt(gate.reviewed_at)}`,
        gate.review_comment ? `- **코멘트**: ${gate.review_comment}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  sections.push(`---`);
  sections.push(
    `_이 보고서는 AX Consulting Agent가 자동 생성했습니다. 최종 검토·서명은 사람이 수행해야 합니다._`,
  );

  return {
    title,
    content: sections.join("\n\n"),
  };
}

export async function generateFinalReport(input: {
  task: Task;
  company: Company;
  evaluation: Evaluation;
  outputs: StageOutputRow[];
  gate: Gate;
}): Promise<{ title: string; content: string }> {
  if (input.outputs.length < 5) {
    throw new Error(
      `5개 Stage 산출물이 모두 필요합니다. 현재: ${input.outputs.length}개`,
    );
  }
  const summary = await generateExecutiveSummary(
    input.task,
    input.evaluation,
    input.outputs,
    input.gate,
  );
  return assembleMarkdown({ ...input, summary });
}
