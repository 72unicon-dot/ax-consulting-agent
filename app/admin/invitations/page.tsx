import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteForm, CancelButton } from "./client";

export const dynamic = "force-dynamic";

type Company = { id: string; name: string };

export default async function InvitationsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/invitations");

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id, name, email")
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
            초대 관리는 super_admin 또는 company_admin만 사용할 수 있습니다.
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

  const { data: companies } = isSuper
    ? await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true })
    : { data: null as Company[] | null };

  const homeCompany = !isSuper
    ? await supabase
        .from("companies")
        .select("id, name")
        .eq("id", profile.company_id!)
        .maybeSingle()
    : { data: null as Company | null };

  const availableCompanies: Company[] = isSuper
    ? (companies ?? [])
    : homeCompany.data
      ? [homeCompany.data]
      : [];

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, role, company_id, expires_at, used_at, created_at")
    .order("created_at", { ascending: false });

  const nowIso = new Date().toISOString();
  const companyNames = new Map(availableCompanies.map((c) => [c.id, c.name]));

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
            초대 관리
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            이메일로 초대를 발급하면, 초대받은 사용자가 매직링크로 로그인할 때
            자동으로 프로필이 생성됩니다.
          </p>
        </header>

        <section className="mt-8">
          <InviteForm
            isSuper={isSuper}
            companies={availableCompanies}
            defaultCompanyId={profile.company_id ?? undefined}
          />
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-zinc-500">
            초대 목록 · {invitations?.length ?? 0}건
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {invitations && invitations.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {invitations.map((inv) => {
                  const status =
                    inv.used_at != null
                      ? ("closed" as const)
                      : inv.expires_at <= nowIso
                        ? ("expired" as const)
                        : ("active" as const);
                  const tone =
                    status === "active"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : status === "expired"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
                  const label =
                    status === "active"
                      ? "활성"
                      : status === "expired"
                        ? "만료"
                        : "종료";
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {inv.email}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}
                          >
                            {label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {inv.role}
                          {companyNames.has(inv.company_id ?? "") &&
                            ` · ${companyNames.get(inv.company_id ?? "")}`}
                          {" · 만료 "}
                          {new Date(inv.expires_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      {status === "active" && <CancelButton id={inv.id} />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                아직 발급된 초대가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
