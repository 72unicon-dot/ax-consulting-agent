import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROLES = new Set([
  "super_admin",
  "company_admin",
  "process_owner",
  "member",
]);
const STATUSES = new Set(["active", "inactive"]);

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/users/[id]">,
) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    role?: string;
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

  const [{ data: me }, { data: target }] = await Promise.all([
    supabase
      .from("users")
      .select("id, role, company_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, role, company_id")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!target) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const isSelf = id === user.id;
  const isSuper = me?.role === "super_admin";
  const isCompanyAdminOfSame =
    me?.role === "company_admin" &&
    me.company_id != null &&
    me.company_id === target.company_id &&
    target.role !== "super_admin";

  if (!isSelf && !isSuper && !isCompanyAdminOfSame) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const patch: { name?: string; role?: string; status?: string } = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json(
        { error: "이름은 비울 수 없습니다." },
        { status: 400 },
      );
    }
    patch.name = n;
  }

  if (body.role !== undefined) {
    if (isSelf && !isSuper) {
      return NextResponse.json(
        { error: "본인의 역할은 변경할 수 없습니다." },
        { status: 403 },
      );
    }
    if (!ROLES.has(body.role)) {
      return NextResponse.json({ error: "잘못된 역할" }, { status: 400 });
    }
    if (!isSuper && body.role === "super_admin") {
      return NextResponse.json(
        { error: "super_admin으로 승격은 super_admin만 가능합니다." },
        { status: 403 },
      );
    }
    patch.role = body.role;
  }

  if (body.status !== undefined) {
    if (isSelf) {
      return NextResponse.json(
        { error: "본인의 상태는 변경할 수 없습니다." },
        { status: 403 },
      );
    }
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "잘못된 상태" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경 필드가 없습니다." }, { status: 400 });
  }

  const { error: updErr } = await supabase
    .from("users")
    .update(patch)
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
