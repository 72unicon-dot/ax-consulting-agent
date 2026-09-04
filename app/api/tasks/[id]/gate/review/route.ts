import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const GATE_NUMBER = 5;

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/gate/review">,
) {
  const { id: taskId } = await params;

  const body = (await request.json().catch(() => null)) as {
    decision?: "approve" | "reject";
    comment?: string;
  } | null;
  if (!body || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json(
      { error: "decision(approve|reject) 필요" },
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

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const canReview =
    profile?.role === "super_admin" || profile?.role === "company_admin";
  if (!canReview) {
    return NextResponse.json(
      { error: "게이트 검토 권한이 없습니다. (super_admin 또는 company_admin)" },
      { status: 403 },
    );
  }

  const { data: gate, error: gateErr } = await supabase
    .from("gates")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("gate_number", GATE_NUMBER)
    .maybeSingle();
  if (gateErr) {
    return NextResponse.json({ error: gateErr.message }, { status: 500 });
  }
  if (!gate) {
    return NextResponse.json({ error: "gate not found" }, { status: 404 });
  }
  if (gate.status !== "requested") {
    return NextResponse.json(
      { error: `승인 요청 상태가 아닙니다. (현재: ${gate.status})` },
      { status: 400 },
    );
  }

  const nextStatus = body.decision === "approve" ? "approved" : "rejected";
  const { error: updErr } = await supabase
    .from("gates")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_comment: body.comment?.trim() || null,
    })
    .eq("id", gate.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (nextStatus === "approved") {
    await supabase
      .from("tasks")
      .update({ current_status: "development_ready" })
      .eq("id", taskId);
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
