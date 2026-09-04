import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/kpi-records/[id]">,
) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    current_value?: number | null;
    target_value?: number | null;
    baseline?: number | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const patch: {
    measured_at: string;
    measured_by: string;
    current_value?: number | null;
    target_value?: number | null;
    baseline?: number | null;
  } = {
    measured_at: new Date().toISOString(),
    measured_by: user.id,
  };
  if (body.current_value !== undefined) patch.current_value = body.current_value;
  if (body.target_value !== undefined) patch.target_value = body.target_value;
  if (body.baseline !== undefined) patch.baseline = body.baseline;

  const { error: updErr } = await supabase
    .from("kpi_records")
    .update(patch)
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext<"/api/kpi-records/[id]">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error: delErr } = await supabase
    .from("kpi_records")
    .delete()
    .eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
