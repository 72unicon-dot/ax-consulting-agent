import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TasksListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tasks");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, current_status, ax_path, ax_total_score, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ← 대시보드
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              과제 목록
            </h1>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + 새 과제
          </Link>
        </header>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
                    <span className="font-mono text-sm text-zinc-500">
                      {t.ax_total_score ?? "—"}/100
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              아직 과제가 없습니다.{" "}
              <Link
                href="/tasks/new"
                className="font-medium text-zinc-900 underline dark:text-zinc-50"
              >
                지금 등록하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
