import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGateChecklist } from "@/lib/gates/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GATE_NUMBER = 5;

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/gate/generate">,
) {
  const { id: taskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, current_status")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const { data: outputs, error: outErr } = await supabase
    .from("pbl_outputs")
    .select("stage_number, content, pending_items")
    .eq("task_id", taskId);
  if (outErr) {
    return NextResponse.json({ error: outErr.message }, { status: 500 });
  }
  if (!outputs || outputs.length < 5) {
    return NextResponse.json(
      {
        error: `5개 stage 산출물이 모두 필요합니다. 현재: ${outputs?.length ?? 0}개`,
      },
      { status: 400 },
    );
  }

  let generated;
  try {
    generated = await generateGateChecklist(outputs);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `체크리스트 생성 실패: ${message}` },
      { status: 502 },
    );
  }

  const checklistPayload = {
    summary: generated.summary,
    items: generated.items,
  };

  const { data: existing } = await supabase
    .from("gates")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("gate_number", GATE_NUMBER)
    .maybeSingle();

  if (existing) {
    if (existing.status === "approved") {
      return NextResponse.json(
        { error: "이미 승인된 게이트는 다시 생성할 수 없습니다." },
        { status: 400 },
      );
    }
    const { error: updErr } = await supabase
      .from("gates")
      .update({
        checklist: checklistPayload,
        status: "checklist_ready",
        requested_at: null,
        requested_by: null,
        reviewed_at: null,
        reviewed_by: null,
        review_comment: null,
      })
      .eq("id", existing.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabase.from("gates").insert({
      task_id: taskId,
      gate_number: GATE_NUMBER,
      status: "checklist_ready",
      checklist: checklistPayload,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, gate_number: GATE_NUMBER, checklist: checklistPayload });
}
