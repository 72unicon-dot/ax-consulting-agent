import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRow } from "./client";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/users");

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    (profile.role !== "super_admin" && profile.role !== "company_admin")
  ) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950">
          <h1 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
            접근 권한이 없습니다
          </h1>
          <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
            사용자 관리는 super_admin 또는 company_admin만 사용할 수 있습니다.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm font-medium text-rose-900 underline dark:text-rose-100"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const isSuper = profile.role === "super_admin";

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, status, created_at")
    .order("created_at", { ascending: false });

  const companyIds = [
    ...new Set((users ?? []).map((u) => u.company_id).filter(Boolean)),
  ] as string[];
  const { data: companies } = companyIds.length
    ? await supabase
        .from("companies")
        .select("id, name")
        .in("id", companyIds)
    : { data: [] };
  const companyNames = new Map(
    (companies ?? []).map((c) => [c.id, c.name] as const),
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 대시보드
        </Link>
        <header className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            사용자 관리
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isSuper
              ? "전체 사용자의 역할과 상태를 관리합니다."
              : "회사 소속 사용자의 역할과 상태를 관리합니다."}
          </p>
        </header>

        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {users && users.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  self={u.id === user.id}
                  isSuperViewer={isSuper}
                  companyName={
                    u.company_id
                      ? (companyNames.get(u.company_id) ?? "—")
                      : "—"
                  }
                  user={{
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    status: u.status,
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              사용자가 없습니다.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
