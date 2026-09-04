import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import { EvaluateButton } from "./evaluate-button";
import { FileUploadButton, DeleteFileButton } from "./file-controls";

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

  const [{ data: evaluation }, { data: stagesRows }, { data: outputsRows }] =
    await Promise.all([
      supabase
        .from("ax_evaluations")
        .select("*")
        .eq("task_id", id)
        .order("evaluated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pbl_stages")
        .select("stage_number, status, started_at, completed_at")
        .eq("task_id", id),
      supabase
        .from("pbl_outputs")
        .select("stage_number, content, version, updated_at")
        .eq("task_id", id),
    ]);

  const stageMap = new Map(
    (stagesRows ?? []).map((r) => [r.stage_number as StageNumber, r]),
  );
  const outputMap = new Map(
    (outputsRows ?? []).map((r) => [r.stage_number as StageNumber, r]),
  );

  const { data: gate } = await supabase
    .from("gates")
    .select("gate_number, status, reviewed_at")
    .eq("task_id", id)
    .eq("gate_number", 5)
    .maybeSingle();

  const { count: kpiCount } = await supabase
    .from("kpi_records")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);

  const { data: files } = await supabase
    .from("task_files")
    .select("id, file_name, file_size, file_type, uploaded_at")
    .eq("task_id", id)
    .order("uploaded_at", { ascending: false });

  const allStagesDone = [1, 2, 3, 4, 5].every((n) =>
    outputMap.has(n as StageNumber),
  );

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
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              첨부 파일
            </h2>
            <FileUploadButton taskId={id} />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {files && files.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {files.map((f) => {
                  const isImage = f.file_type?.startsWith("image/");
                  const isPdf = f.file_type === "application/pdf";
                  return (
                    <li key={f.id} className="flex flex-col gap-3 px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/api/task-files/${f.id}/download`}
                            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                          >
                            {f.file_name}
                          </a>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {f.file_size
                              ? `${(f.file_size / 1024).toFixed(1)} KB`
                              : "—"}
                            {f.file_type ? ` · ${f.file_type}` : ""}
                            {" · "}
                            {new Date(f.uploaded_at).toLocaleString("ko-KR")}
                          </p>
                        </div>
                        <DeleteFileButton fileId={f.id} />
                      </div>
                      {isImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/task-files/${f.id}/view`}
                          alt={f.file_name}
                          className="max-h-64 w-auto self-start rounded-md border border-zinc-200 object-contain dark:border-zinc-800"
                          loading="lazy"
                        />
                      )}
                      {isPdf && (
                        <details className="rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            PDF 미리보기
                          </summary>
                          <object
                            data={`/api/task-files/${f.id}/view`}
                            type="application/pdf"
                            className="h-96 w-full"
                          >
                            <p className="p-3 text-xs text-zinc-500">
                              브라우저에서 이 PDF를 표시할 수 없습니다.{" "}
                              <a
                                href={`/api/task-files/${f.id}/download`}
                                className="underline"
                              >
                                다운로드
                              </a>
                              하여 확인하세요.
                            </p>
                          </object>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-zinc-500">
                아직 첨부된 파일이 없습니다. 인터뷰 근거 자료·현장 자료 등을
                업로드하세요. (최대 25MB)
              </div>
            )}
          </div>
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

        {evaluation &&
          (task.ax_path === "rule" || task.ax_path === "ai") && (
            <section className="mt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  PBL 진행
                </h2>
                <p className="text-xs text-zinc-500">
                  진단 인터뷰부터 실행 로드맵까지 5단계
                </p>
              </div>
              <ol className="mt-4 flex flex-col gap-2">
                {([1, 2, 3, 4, 5] as StageNumber[]).map((s) => {
                  const stageRow = stageMap.get(s);
                  const outputRow = outputMap.get(s);
                  const meta = STAGE_META[s];
                  const status = stageRow?.status ?? "not_started";
                  return (
                    <li key={s}>
                      <Link
                        href={`/tasks/${task.id}/pbl/${s}`}
                        className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                                status === "completed"
                                  ? "bg-emerald-500 text-white"
                                  : status === "in_progress"
                                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                              }`}
                            >
                              {status === "completed" ? "✓" : s}
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {meta.title}
                            </span>
                            {outputRow && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                v{outputRow.version}
                              </span>
                            )}
                          </div>
                          {outputRow ? (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                              {(outputRow.content ?? "").replace(/^#.*\n\n?/, "")}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-zinc-400">
                              {meta.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-zinc-400">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>

              {allStagesDone && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      게이트 검토 · Gate 5
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {gate?.status === "approved"
                        ? "승인됨 — 개발 착수 준비 완료"
                        : gate?.status === "rejected"
                          ? "반려됨 — 체크리스트 재생성 필요"
                          : gate?.status === "requested"
                            ? "관리자 검토 대기 중"
                            : gate?.status === "checklist_ready"
                              ? "체크리스트 준비됨"
                              : "체크리스트 자동 생성 가능"}
                    </p>
                    <Link
                      href={`/tasks/${task.id}/gate`}
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      게이트 열기 →
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      최종 보고서
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      5개 산출물 + 평가 + 게이트 결과를 통합한 임원 보고서
                    </p>
                    <Link
                      href={`/tasks/${task.id}/reports`}
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      보고서 열기 →
                    </Link>
                  </div>
                </div>
              )}

              {evaluation && (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        KPI 트래킹
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {kpiCount && kpiCount > 0
                          ? `${kpiCount}개 KPI · baseline → target 진척 추적`
                          : "PBL 산출물에서 KPI 자동 추출 또는 직접 등록"}
                      </p>
                    </div>
                    <Link
                      href={`/tasks/${task.id}/kpis`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      KPI 열기 →
                    </Link>
                  </div>
                </div>
              )}
            </section>
          )}

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
