import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ExtractButton,
  AddKpiForm,
  MeasurementInput,
  DeleteKpiButton,
} from "./client";

export const dynamic = "force-dynamic";

const CATEGORY_META: Record<
  string,
  { ko: string; cls: string }
> = {
  business: {
    ko: "사업 성과",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  ai: {
    ko: "AI 품질",
    cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  system: {
    ko: "시스템",
    cls: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  cost: {
    ko: "비용",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  adoption: {
    ko: "도입/사용",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
};

function computeProgress(
  baseline: number | null,
  current: number | null,
  target: number | null,
): number | null {
  if (baseline == null || current == null || target == null) return null;
  if (baseline === target) return current === target ? 100 : 0;
  const raw = ((current - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, raw));
}

export default async function KpiPage({ params }: PageProps<"/tasks/[id]/kpis">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}/kpis`);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!task) notFound();

  const [{ data: kpis }, outputsCountRes] = await Promise.all([
    supabase
      .from("kpi_records")
      .select("id, kpi_category, kpi_name, baseline, current_value, target_value, unit, measured_at")
      .eq("task_id", id)
      .order("kpi_category", { ascending: true })
      .order("kpi_name", { ascending: true }),
    supabase
      .from("pbl_outputs")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id),
  ]);

  const hasOutputs = (outputsCountRes.count ?? 0) > 0;
  const grouped = new Map<string, NonNullable<typeof kpis>>();
  for (const k of kpis ?? []) {
    const arr = grouped.get(k.kpi_category) ?? [];
    arr.push(k);
    grouped.set(k.kpi_category, arr);
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href={`/tasks/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 과제로 돌아가기
        </Link>

        <header className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              KPI 트래킹
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {task.title} · 총 {kpis?.length ?? 0}개
            </p>
          </div>
          {hasOutputs && (
            <ExtractButton taskId={id} hasKpis={(kpis?.length ?? 0) > 0} />
          )}
        </header>

        {!hasOutputs && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            KPI 자동 추출은 PBL 산출물이 최소 1개 이상 있을 때 가능합니다.
            그동안 아래 폼으로 직접 추가할 수 있습니다.
          </section>
        )}

        <section className="mt-6">
          <AddKpiForm taskId={id} />
        </section>

        <section className="mt-8 flex flex-col gap-6">
          {(kpis?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              아직 등록된 KPI가 없습니다.
            </div>
          ) : (
            ["business", "ai", "system", "cost", "adoption"].map((cat) => {
              const list = grouped.get(cat) ?? [];
              if (list.length === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}
                    >
                      {meta.ko}
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span>{list.length}개</span>
                  </h2>
                  <ul className="mt-4 flex flex-col gap-4">
                    {list.map((k) => {
                      const progress = computeProgress(
                        k.baseline as number | null,
                        k.current_value as number | null,
                        k.target_value as number | null,
                      );
                      return (
                        <li key={k.id} className="flex flex-col gap-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {k.kpi_name}
                              {k.unit && (
                                <span className="ml-1 text-xs text-zinc-500">
                                  ({k.unit})
                                </span>
                              )}
                            </p>
                            <DeleteKpiButton kpiId={k.id} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              <span>
                                {k.baseline ?? "—"}
                              </span>
                              <span>→</span>
                              <MeasurementInput
                                kpiId={k.id}
                                initial={k.current_value as number | null}
                              />
                              <span>→</span>
                              <span>{k.target_value ?? "—"}</span>
                            </div>
                            {progress !== null && (
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                {progress.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {progress !== null && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                          {k.measured_at && (
                            <p className="text-[10px] text-zinc-400">
                              최근 측정:{" "}
                              {new Date(k.measured_at).toLocaleString("ko-KR")}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
