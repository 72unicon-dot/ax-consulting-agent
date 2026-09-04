import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "../theme-toggle";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, status")
    .eq("id", user.id)
    .maybeSingle();

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("id, name, industry, status")
        .eq("id", profile.company_id)
        .maybeSingle()
    : { data: null };

  const { data: tasks } = profile?.company_id
    ? await supabase
        .from("tasks")
        .select("id, title, current_status, ax_path, ax_total_score, updated_at")
        .eq("company_id", profile.company_id)
        .order("updated_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  const { data: statusRows } = profile?.company_id
    ? await supabase
        .from("tasks")
        .select("current_status")
        .eq("company_id", profile.company_id)
    : { data: [] as { current_status: string }[] };

  const statusCounts = { total: 0, active: 0, gate: 0, done: 0 };
  const IN_PROGRESS = new Set([
    "registered",
    "evaluating",
    "pbl_1",
    "pbl_2",
    "pbl_3",
    "pbl_4",
    "pbl_5",
  ]);
  for (const t of statusRows ?? []) {
    statusCounts.total++;
    if (IN_PROGRESS.has(t.current_status)) statusCounts.active++;
    if (t.current_status === "gate_pending") statusCounts.gate++;
    if (t.current_status === "development_ready" || t.current_status === "completed")
      statusCounts.done++;
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-medium tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              Dashboard
            </span>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              안녕하세요, {profile?.name ?? user.email}님
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {company?.name ? `${company.name} · ` : ""}
              역할: {profile?.role ?? "미지정"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label="알림"
            >
              알림
              {unreadCount && unreadCount > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
            {(profile?.role === "super_admin" ||
              profile?.role === "company_admin") && (
              <>
                <Link
                  href="/admin/invitations"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  초대
                </Link>
                <Link
                  href="/admin/users"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  사용자
                </Link>
              </>
            )}
            {profile?.role === "super_admin" && (
              <Link
                href="/admin/companies"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                회사
              </Link>
            )}
            <Link
              href="/tasks/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + 새 과제
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                로그아웃
              </button>
            </form>
          </div>
        </header>

        {profile?.company_id && (
          <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="전체 과제" value={statusCounts.total} tone="slate" />
            <StatCard label="진행 중" value={statusCounts.active} tone="sky" />
            <StatCard label="게이트 대기" value={statusCounts.gate} tone="amber" />
            <StatCard label="완료" value={statusCounts.done} tone="emerald" />
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              최근 과제
            </h2>
            <Link
              href="/tasks"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              전체 보기 ({tasks?.length ?? 0}건) →
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {tasks && tasks.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {t.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {t.current_status} · {t.ax_path ?? "경로 미결정"}
                        </p>
                      </div>
                      <span className="text-sm font-mono text-zinc-500">
                        {t.ax_total_score ?? "—"}/100
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                아직 등록된 과제가 없습니다.
                {!profile && (
                  <p className="mt-2 text-xs text-rose-500">
                    프로필이 생성되지 않았습니다. 관리자에게 초대를 요청하세요.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-16 text-xs text-zinc-500">
          AX Consulting Agent · dashboard
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "sky" | "amber" | "emerald";
}) {
  const cls = {
    slate: "text-slate-800 dark:text-slate-200",
    sky: "text-sky-700 dark:text-sky-400",
    amber: "text-amber-700 dark:text-amber-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${cls}`}>
        {value}
      </p>
    </div>
  );
}
