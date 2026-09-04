import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateReportButton } from "./generate-button";

export const dynamic = "force-dynamic";

export default async function ReportsListPage({
  params,
}: PageProps<"/tasks/[id]/reports">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}/reports`);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!task) notFound();

  const [{ data: outputs }, { data: gate }, { data: reports }] =
    await Promise.all([
      supabase
        .from("pbl_outputs")
        .select("stage_number")
        .eq("task_id", id),
      supabase
        .from("gates")
        .select("status")
        .eq("task_id", id)
        .eq("gate_number", 5)
        .maybeSingle(),
      supabase
        .from("reports")
        .select("id, title, report_type, generated_at")
        .eq("task_id", id)
        .order("generated_at", { ascending: false }),
    ]);

  const allStagesDone = (outputs?.length ?? 0) >= 5;
  const gateApproved = gate?.status === "approved";

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
              보고서
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{task.title}</p>
          </div>
          {allStagesDone && (
            <GenerateReportButton
              taskId={id}
              hasReports={(reports?.length ?? 0) > 0}
              gateApproved={gateApproved}
            />
          )}
        </header>

        {!allStagesDone && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            PBL 5개 Stage 산출물이 모두 완료된 후에 최종 보고서를 생성할 수
            있습니다.
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-medium text-zinc-500">
            생성 이력 · {reports?.length ?? 0}건
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {reports && reports.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/tasks/${id}/reports/${r.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {r.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {r.report_type} ·{" "}
                          {new Date(r.generated_at).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400">열기 →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                아직 생성된 보고서가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
