import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["active", "inactive"]);

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    industry?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    status?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "회사명은 필수입니다." }, { status: 400 });
  }

  const status = body?.status ?? "active";
  if (!STATUSES.has(status)) {
    return NextResponse.json(
      { error: "상태는 active 또는 inactive여야 합니다." },
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

  const { data: inserted, error: insErr } = await supabase
    .from("companies")
    .insert({
      name,
      industry: body?.industry?.trim() || null,
      contact_name: body?.contact_name?.trim() || null,
      contact_email: body?.contact_email?.trim() || null,
      status,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "회사 생성 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
