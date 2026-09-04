import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "company_admin",
  "process_owner",
  "member",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: string;
    company_id?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const role = body?.role?.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "올바른 이메일이 필요합니다." },
      { status: 400 },
    );
  }
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: "역할이 유효하지 않습니다." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "profile missing" }, { status: 403 });
  }

  const isSuper = profile.role === "super_admin";
  let companyId = body?.company_id?.trim() || profile.company_id;

  if (!isSuper) {
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "소속 회사가 없습니다." },
        { status: 403 },
      );
    }
    if (profile.role !== "company_admin") {
      return NextResponse.json(
        { error: "초대 권한이 없습니다. (company_admin 또는 super_admin)" },
        { status: 403 },
      );
    }
    if (role === "super_admin") {
      return NextResponse.json(
        { error: "super_admin은 super_admin만 초대할 수 있습니다." },
        { status: 403 },
      );
    }
    // company_admin은 자기 회사만
    companyId = profile.company_id;
  } else if (!companyId) {
    return NextResponse.json(
      { error: "회사 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingUser) {
    return NextResponse.json(
      { error: "이미 등록된 사용자입니다." },
      { status: 409 },
    );
  }

  const { data: activeInv } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (activeInv) {
    return NextResponse.json(
      { error: "해당 이메일로 이미 유효한 초대가 있습니다." },
      { status: 409 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("invitations")
    .insert({
      email,
      role,
      company_id: companyId,
      invited_by: profile.id,
    })
    .select("id, email, role, expires_at")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "초대 생성 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, invitation: inserted });
}
