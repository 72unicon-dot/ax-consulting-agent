import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateTask } from "@/lib/ax/evaluator";
import { createNotifications } from "@/lib/notifications/create";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/evaluate">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, title, description, background, expected_effect, created_by")
    .eq("id", id)
    .maybeSingle();

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  let evaluation;
  try {
    evaluation = await evaluateTask({
      title: task.title,
      description: task.description,
      background: task.background,
      expected_effect: task.expected_effect,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `평가 실패: ${message}` },
      { status: 502 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("ax_evaluations")
    .insert({
      task_id: id,
      ...evaluation,
      evaluated_by: "claude-opus-5",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "평가 저장 실패" },
      { status: 500 },
    );
  }

  const { error: updErr } = await supabase
    .from("tasks")
    .update({
      ax_total_score: evaluation.total_score,
      ax_path: evaluation.path_suggestion,
      current_status:
        evaluation.path_suggestion === "review_needed" ? "evaluating" : "pbl_1",
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (task.created_by && task.created_by !== user.id) {
    await createNotifications([
      {
        user_id: task.created_by,
        type: "task_evaluated",
        task_id: id,
        message: `[${task.title}] AX 평가가 완료되었습니다. 총점 ${evaluation.total_score}/100 · 경로 ${evaluation.path_suggestion.toUpperCase()}`,
      },
    ]);
  }

  return NextResponse.json({ ok: true, evaluation_id: inserted.id, evaluation });
}
