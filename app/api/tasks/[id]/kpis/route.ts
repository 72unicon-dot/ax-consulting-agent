import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set([
  "business",
  "ai",
  "system",
  "cost",
  "adoption",
]);

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/kpis">,
) {
  const { id: taskId } = await params;

  const body = (await request.json().catch(() => null)) as {
    kpi_category?: string;
    kpi_name?: string;
    unit?: string;
    baseline?: number | null;
    target_value?: number | null;
  } | null;

  if (!body?.kpi_name?.trim()) {
    return NextResponse.json({ error: "kpi_name 필요" }, { status: 400 });
  }
  if (!body.kpi_category || !ALLOWED_CATEGORIES.has(body.kpi_category)) {
    return NextResponse.json(
      { error: "유효하지 않은 카테고리" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error: insErr } = await supabase.from("kpi_records").insert({
    task_id: taskId,
    kpi_category: body.kpi_category,
    kpi_name: body.kpi_name.trim(),
    unit: body.unit?.trim() || null,
    baseline: body.baseline ?? null,
    target_value: body.target_value ?? null,
    current_value: body.baseline ?? null,
    measured_by: user.id,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
