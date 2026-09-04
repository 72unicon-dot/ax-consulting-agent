import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: RouteContext<"/api/invitations/[id]/cancel">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, used_at")
    .eq("id", id)
    .maybeSingle();
  if (!invitation) {
    return NextResponse.json({ error: "invitation not found" }, { status: 404 });
  }
  if (invitation.used_at) {
    return NextResponse.json(
      { error: "이미 사용/취소된 초대입니다." },
      { status: 400 },
    );
  }

  const { error: updErr } = await supabase
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
