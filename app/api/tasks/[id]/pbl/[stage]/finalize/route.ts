import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import { loadHistory } from "@/lib/pbl/session";
import { finalizeStage } from "@/lib/pbl/finalize";
import { notifyCompanyRoles } from "@/lib/notifications/create";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID: readonly StageNumber[] = [1, 2, 3, 4, 5];

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/pbl/[stage]/finalize">,
) {
  const { id: taskId, stage: stageParam } = await params;
  const stage = Number(stageParam) as StageNumber;
  if (!VALID.includes(stage)) {
    return NextResponse.json({ error: "invalid stage" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, current_status, title, company_id")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const history = await loadHistory(supabase, taskId, stage);
  if (history.length === 0) {
    return NextResponse.json(
      { error: "대화 기록이 없어 정리할 내용이 없습니다." },
      { status: 400 },
    );
  }

  let output;
  try {
    output = await finalizeStage(
      stage,
      history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `정리 실패: ${message}` },
      { status: 502 },
    );
  }

  const outputType = STAGE_META[stage].outputType;

  const { data: existing } = await supabase
    .from("pbl_outputs")
    .select("id, version")
    .eq("task_id", taskId)
    .eq("stage_number", stage)
    .maybeSingle();

  if (existing) {
    const { error: updErr } = await supabase
      .from("pbl_outputs")
      .update({
        output_type: outputType,
        content: `# ${output.title}\n\n${output.content}`,
        pending_items: output.pending_items,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabase.from("pbl_outputs").insert({
      task_id: taskId,
      stage_number: stage,
      output_type: outputType,
      content: `# ${output.title}\n\n${output.content}`,
      pending_items: output.pending_items,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  await supabase
    .from("pbl_stages")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .eq("stage_number", stage);

  const nextStatus =
    stage < 5 ? (`pbl_${stage + 1}` as const) : ("gate_pending" as const);

  await supabase
    .from("tasks")
    .update({ current_status: nextStatus })
    .eq("id", taskId);

  if (nextStatus === "gate_pending" && task.company_id) {
    await notifyCompanyRoles(
      task.company_id,
      ["super_admin", "company_admin"],
      {
        type: "gate_submitted",
        task_id: taskId,
        message: `[${task.title}] Stage 5까지 완료되었습니다. Gate 체크리스트 생성을 진행하세요.`,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    output,
    next_status: nextStatus,
    next_stage: stage < 5 ? stage + 1 : null,
  });
}
