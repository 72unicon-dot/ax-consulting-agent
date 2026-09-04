import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "registered", label: "등록됨" },
  { value: "evaluating", label: "평가 중" },
  { value: "pbl_1", label: "PBL 1" },
  { value: "pbl_2", label: "PBL 2" },
  { value: "pbl_3", label: "PBL 3" },
  { value: "pbl_4", label: "PBL 4" },
  { value: "pbl_5", label: "PBL 5" },
  { value: "gate_pending", label: "게이트 대기" },
  { value: "development_ready", label: "개발 착수" },
  { value: "completed", label: "완료" },
  { value: "on_hold", label: "보류" },
] as const;

const PATH_OPTIONS = [
  { value: "", label: "전체 경로" },
  { value: "rule", label: "Rule" },
  { value: "ai", label: "AI" },
  { value: "review_needed", label: "재검토" },
] as const;

export default async function TasksListPage({
  searchParams,
}: PageProps<"/tasks">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tasks");

  const params = await searchParams;
  const status =
    typeof params.status === "string" && params.status ? params.status : null;
  const path =
    typeof params.path === "string" && params.path ? params.path : null;

  let query = supabase
    .from("tasks")
    .select("id, title, current_status, ax_path, ax_total_score, updated_at")
    .order("updated_at", { ascending: false });
  if (status) query = query.eq("current_status", status);
  if (path) query = query.eq("ax_path", path);

  const { data: tasks } = await query;

  const activeFilters = [status, path].filter(Boolean).length;

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex items-end justify-between">
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

        <form className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <FilterSelect
            name="status"
            value={status ?? ""}
            options={STATUS_OPTIONS}
          />
          <FilterSelect name="path" value={path ?? ""} options={PATH_OPTIONS} />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            적용
          </button>
          {activeFilters > 0 && (
            <Link
              href="/tasks"
              className="ml-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              초기화
            </Link>
          )}
          <span className="ml-auto text-xs text-zinc-500">
            {tasks?.length ?? 0}건
          </span>
        </form>

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
              {activeFilters > 0 ? (
                <>
                  현재 필터에 해당하는 과제가 없습니다.{" "}
                  <Link
                    href="/tasks"
                    className="font-medium text-zinc-900 underline dark:text-zinc-50"
                  >
                    필터 초기화
                  </Link>
                </>
              ) : (
                <>
                  아직 과제가 없습니다.{" "}
                  <Link
                    href="/tasks/new"
                    className="font-medium text-zinc-900 underline dark:text-zinc-50"
                  >
                    지금 등록하기
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FilterSelect({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
