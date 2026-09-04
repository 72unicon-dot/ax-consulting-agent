import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/gates/generate";

export const dynamic = "force-dynamic";

const GATE_NUMBER = 5;

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/gate/checklist">,
) {
  const { id: taskId } = await params;

  const body = (await request.json().catch(() => null)) as {
    item_id?: string;
    checked?: boolean;
  } | null;
  if (!body?.item_id || typeof body.checked !== "boolean") {
    return NextResponse.json(
      { error: "item_id, checked 필요" },
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
  if (gate.status === "approved" || gate.status === "rejected") {
    return NextResponse.json(
      { error: "검토가 종료된 게이트는 수정할 수 없습니다." },
      { status: 400 },
    );
  }

  const checklist = gate.checklist as {
    summary: string;
    items: ChecklistItem[];
  };
  const items = checklist.items.map((it) =>
    it.id === body.item_id ? { ...it, checked: body.checked! } : it,
  );

  const { error: updErr } = await supabase
    .from("gates")
    .update({ checklist: { ...checklist, items } })
    .eq("id", gate.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
