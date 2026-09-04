import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["active", "inactive"]);

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/companies/[id]">,
) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    industry?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    status?: string;
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
    name?: string;
    industry?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    status?: string;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json(
        { error: "회사명은 비울 수 없습니다." },
        { status: 400 },
      );
    }
    patch.name = n;
  }
  if (body.industry !== undefined)
    patch.industry = body.industry?.trim() || null;
  if (body.contact_name !== undefined)
    patch.contact_name = body.contact_name?.trim() || null;
  if (body.contact_email !== undefined)
    patch.contact_email = body.contact_email?.trim() || null;
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "잘못된 상태" }, { status: 400 });
    }
    patch.status = body.status;
  }

  const { error: updErr } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
