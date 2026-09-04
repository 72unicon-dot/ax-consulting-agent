import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractKpisFromOutputs } from "@/lib/kpi/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/kpis/extract">,
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
    .select("id")
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

  const { data: outputs, error: outErr } = await supabase
    .from("pbl_outputs")
    .select("stage_number, content")
    .eq("task_id", taskId);
  if (outErr) {
    return NextResponse.json({ error: outErr.message }, { status: 500 });
  }
  if (!outputs || outputs.length === 0) {
    return NextResponse.json(
      { error: "PBL 산출물이 없어 KPI를 추출할 수 없습니다." },
      { status: 400 },
    );
  }

  let kpis;
  try {
    kpis = await extractKpisFromOutputs(outputs);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `KPI 추출 실패: ${message}` },
      { status: 502 },
    );
  }

  const rows = kpis.map((k) => ({
    task_id: taskId,
    kpi_category: k.category,
    kpi_name: k.name,
    baseline: k.baseline,
    target_value: k.target,
    current_value: k.baseline,
    unit: k.unit,
    measured_by: profile?.id ?? null,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("kpi_records")
    .insert(rows)
    .select("id");
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: inserted?.length ?? 0 });
}
