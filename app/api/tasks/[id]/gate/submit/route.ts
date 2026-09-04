import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/gates/generate";
import { notifyCompanyRoles } from "@/lib/notifications/create";

export const dynamic = "force-dynamic";

const GATE_NUMBER = 5;

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/gate/submit">,
) {
  const { id: taskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: gate, error: gateErr } = await supabase
    .from("gates")
    .select("id, checklist, status")
    .eq("task_id", taskId)
    .eq("gate_number", GATE_NUMBER)
    .maybeSingle();
  if (gateErr) {
    return NextResponse.json({ error: gateErr.message }, { status: 500 });
  }
  if (!gate) {
    return NextResponse.json({ error: "gate not found" }, { status: 404 });
  }
  if (gate.status !== "checklist_ready" && gate.status !== "rejected") {
    return NextResponse.json(
      { error: `현재 상태(${gate.status})에서는 승인 요청할 수 없습니다.` },
      { status: 400 },
    );
  }

  const checklist = gate.checklist as {
    summary: string;
    items: ChecklistItem[];
  };
  const uncheckedCount = checklist.items.filter((i) => !i.checked).length;
  if (uncheckedCount > 0) {
    return NextResponse.json(
      { error: `아직 체크되지 않은 항목이 ${uncheckedCount}개 있습니다.` },
      { status: 400 },
    );
  }

  const { error: updErr } = await supabase
    .from("gates")
    .update({
      status: "requested",
      requested_at: new Date().toISOString(),
      requested_by: user.id,
    })
    .eq("id", gate.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("company_id, title")
    .eq("id", taskId)
    .maybeSingle();
  if (task?.company_id) {
    await notifyCompanyRoles(
      task.company_id,
      ["super_admin", "company_admin"],
      {
        type: "gate_submitted",
        task_id: taskId,
        message: `[${task.title}] Gate ${GATE_NUMBER} 승인 요청이 도착했습니다.`,
      },
    );
  }

  return NextResponse.json({ ok: true });
}
