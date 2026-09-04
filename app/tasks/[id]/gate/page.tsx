import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/gates/generate";
import { GenerateGateButton } from "./generate-button";
import { ChecklistRow } from "./checklist-item";
import { SubmitForReview, ReviewForm } from "./actions";

export const dynamic = "force-dynamic";

const GATE_NUMBER = 5;

const STATUS_META: Record<
  string,
  { ko: string; tone: "slate" | "amber" | "emerald" | "rose" }
> = {
  not_started: { ko: "미시작", tone: "slate" },
  checklist_ready: { ko: "체크리스트 준비", tone: "amber" },
  requested: { ko: "검토 요청됨", tone: "amber" },
  approved: { ko: "승인 완료", tone: "emerald" },
  rejected: { ko: "반려됨", tone: "rose" },
};

const TONE_CLS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export default async function GatePage({ params }: PageProps<"/tasks/[id]/gate">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}/gate`);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, current_status, ax_path")
    .eq("id", id)
    .maybeSingle();
  if (!task) notFound();

  const [{ data: profile }, { data: outputs }, { data: gate }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("pbl_outputs")
        .select("stage_number")
        .eq("task_id", id),
      supabase
        .from("gates")
        .select("*")
        .eq("task_id", id)
        .eq("gate_number", GATE_NUMBER)
        .maybeSingle(),
    ]);

  const stagesDone = new Set(
    (outputs ?? []).map((o) => o.stage_number as number),
  );
  const allStagesDone = [1, 2, 3, 4, 5].every((n) => stagesDone.has(n));

  const checklist =
    (gate?.checklist as { summary: string; items: ChecklistItem[] } | null) ??
    null;
  const meta = gate ? STATUS_META[gate.status] : null;

  const canReview =
    profile?.role === "super_admin" || profile?.role === "company_admin";
  const locked =
    !gate ||
    gate.status === "requested" ||
    gate.status === "approved" ||
    gate.status === "rejected";

  const uncheckedCount = checklist?.items.filter((i) => !i.checked).length ?? 0;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/tasks/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 과제로 돌아가기
        </Link>

        <header className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              게이트 검토 · Gate {GATE_NUMBER}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              PBL 5단계 산출물을 근거로 개발 착수 승인 여부를 판정합니다.
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              {task.title} · 경로: {task.ax_path?.toUpperCase() ?? "미판정"}
            </p>
          </div>
          {meta && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLS[meta.tone]}`}
            >
              {meta.ko}
            </span>
          )}
        </header>

        {!allStagesDone ? (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              PBL 5단계 산출물이 모두 필요합니다. 현재 완료:{" "}
              {stagesDone.size}/5. 산출물이 없는 stage에서 "완료 & 다음으로"
              버튼으로 정리를 마쳐 주세요.
            </p>
          </section>
        ) : !gate ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              아직 이 과제의 게이트 체크리스트가 생성되지 않았습니다. 지금까지의
              산출물을 바탕으로 자동 생성할 수 있습니다.
            </p>
            <div className="mt-4">
              <GenerateGateButton taskId={id} hasGate={false} />
            </div>
          </section>
        ) : (
          <>
            {checklist?.summary && (
              <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  검토 요약
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {checklist.summary}
                </p>
              </section>
            )}

            <section className="mt-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  체크리스트 ({(checklist?.items.length ?? 0) - uncheckedCount}/
                  {checklist?.items.length ?? 0})
                </h2>
                {gate.status === "checklist_ready" && (
                  <GenerateGateButton taskId={id} hasGate={true} />
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {(checklist?.items ?? []).map((item) => (
                  <ChecklistRow
                    key={item.id}
                    taskId={id}
                    item={item}
                    locked={locked}
                  />
                ))}
              </ul>
            </section>

            {gate.status === "checklist_ready" && (
              <section className="mt-6 flex justify-end">
                <SubmitForReview taskId={id} disabled={uncheckedCount > 0} />
              </section>
            )}

            {gate.status === "requested" && (
              <section className="mt-6">
                {canReview ? (
                  <ReviewForm taskId={id} />
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    관리자 검토 대기 중입니다.
                    {gate.requested_at && (
                      <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                        요청: {new Date(gate.requested_at).toLocaleString("ko-KR")}
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {(gate.status === "approved" || gate.status === "rejected") && (
              <section
                className={`mt-6 rounded-2xl border p-6 ${
                  gate.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                    : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    gate.status === "approved"
                      ? "text-emerald-900 dark:text-emerald-200"
                      : "text-rose-900 dark:text-rose-200"
                  }`}
                >
                  {gate.status === "approved" ? "승인됨" : "반려됨"}
                  {gate.reviewed_at && (
                    <span className="ml-2 text-xs font-normal">
                      {new Date(gate.reviewed_at).toLocaleString("ko-KR")}
                    </span>
                  )}
                </p>
                {gate.review_comment && (
                  <p className="mt-2 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
                    {gate.review_comment}
                  </p>
                )}
                {gate.status === "rejected" && (
                  <div className="mt-4">
                    <GenerateGateButton taskId={id} hasGate={true} />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
