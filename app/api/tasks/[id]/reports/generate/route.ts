import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFinalReport } from "@/lib/reports/generate";
import { notifyCompanyRoles } from "@/lib/notifications/create";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/reports/generate">,
) {
  const { id: taskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, title, description, background, expected_effect, ax_path, ax_total_score, company_id",
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const [{ data: company }, { data: evaluation }, { data: outputs }, { data: gate }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("name, industry")
        .eq("id", task.company_id)
        .maybeSingle(),
      supabase
        .from("ax_evaluations")
        .select(
          "score_effect, score_feasibility, score_data, score_risk, score_scalability, total_score, path_suggestion, recommendation, evaluated_at",
        )
        .eq("task_id", taskId)
        .order("evaluated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pbl_outputs")
        .select("stage_number, content, pending_items, version, updated_at")
        .eq("task_id", taskId),
      supabase
        .from("gates")
        .select("gate_number, status, review_comment, reviewed_at, checklist")
        .eq("task_id", taskId)
        .eq("gate_number", 5)
        .maybeSingle(),
    ]);

  let assembled;
  try {
    assembled = await generateFinalReport({
      task,
      company: company ?? null,
      evaluation: evaluation ?? null,
      outputs: outputs ?? [],
      gate: gate ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `보고서 생성 실패: ${message}` },
      { status: 502 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("reports")
    .insert({
      task_id: taskId,
      report_type: "final",
      title: assembled.title,
      content: assembled.content,
      generated_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "보고서 저장 실패" },
      { status: 500 },
    );
  }

  await notifyCompanyRoles(
    task.company_id,
    ["super_admin", "company_admin"],
    {
      type: "report_ready",
      task_id: taskId,
      message: `[${task.title}] 최종 보고서가 생성되었습니다.`,
    },
  );

  return NextResponse.json({ ok: true, report_id: inserted.id });
}
