import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvaluateButton } from "./evaluate-button";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: PageProps<"/tasks/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}`);

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, title, description, background, expected_effect, current_status, ax_path, ax_total_score, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!task) notFound();

  const { data: evaluation } = await supabase
    .from("ax_evaluations")
    .select("*")
    .eq("task_id", id)
    .order("evaluated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/tasks"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 과제 목록
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {task.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Chip>{task.current_status}</Chip>
            {task.ax_path && <Chip tone="emerald">{task.ax_path.toUpperCase()}</Chip>}
            {task.ax_total_score !== null && (
              <Chip tone="zinc">{task.ax_total_score}/100</Chip>
            )}
          </div>
        </header>

        <section className="mt-8 grid gap-4">
          <Info label="설명" value={task.description} />
          <Info label="배경" value={task.background} />
          <Info label="기대 효과" value={task.expected_effect} />
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              AX 평가
            </h2>
            <EvaluateButton taskId={id} hasEvaluation={Boolean(evaluation)} />
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            {evaluation ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Score label="효과" value={evaluation.score_effect} />
                  <Score label="실현" value={evaluation.score_feasibility} />
                  <Score label="데이터" value={evaluation.score_data} />
                  <Score label="리스크" value={evaluation.score_risk} />
                  <Score label="확장성" value={evaluation.score_scalability} />
                </div>

                <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <Reason label="효과 근거" value={evaluation.reason_effect} />
                  <Reason label="실현가능성 근거" value={evaluation.reason_feasibility} />
                  <Reason label="데이터 근거" value={evaluation.reason_data} />
                  <Reason label="리스크 근거" value={evaluation.reason_risk} />
                  <Reason label="확장성 근거" value={evaluation.reason_scalability} />
                </div>

                <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    권고 · 경로: {evaluation.path_suggestion?.toUpperCase()}
                  </p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">
                    {evaluation.recommendation}
                  </p>
                </div>

                <p className="text-xs text-zinc-400">
                  {new Date(evaluation.evaluated_at).toLocaleString("ko-KR")} ·{" "}
                  {evaluation.evaluated_by}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                아직 평가가 없습니다. 우측 상단의 버튼으로 실행하세요.
              </p>
            )}
          </div>
        </section>

        <footer className="mt-12 text-xs text-zinc-400">
          등록: {new Date(task.created_at).toLocaleString("ko-KR")} · 수정:{" "}
          {new Date(task.updated_at).toLocaleString("ko-KR")}
        </footer>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
        {value ?? <span className="text-zinc-400">—</span>}
      </p>
    </div>
  );
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "zinc";
}) {
  const cls = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    emerald:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    zinc: "bg-zinc-100 font-mono text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="mt-1 font-mono text-lg text-zinc-900 dark:text-zinc-50">
        {value ?? "—"}
      </span>
      <span className="text-[10px] text-zinc-400">/20</span>
    </div>
  );
}

function Reason({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 leading-relaxed">{value}</p>
    </div>
  );
}
