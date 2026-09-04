import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import { PblChat } from "./chat";
import { StageStepper, type StageStatus } from "./stepper";
import { FinalizeButton } from "./finalize-button";

export const dynamic = "force-dynamic";

const VALID: readonly StageNumber[] = [1, 2, 3, 4, 5];

export default async function PblStagePage({
  params,
}: PageProps<"/tasks/[id]/pbl/[stage]">) {
  const { id, stage: stageParam } = await params;
  const stage = Number(stageParam) as StageNumber;
  if (!VALID.includes(stage)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}/pbl/${stage}`);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, ax_path, current_status")
    .eq("id", id)
    .maybeSingle();
  if (!task) notFound();

  const [{ data: history }, { data: stages }, { data: output }] =
    await Promise.all([
      supabase
        .from("pbl_chat_messages")
        .select("id, role, content, created_at")
        .eq("task_id", id)
        .eq("stage_number", stage)
        .order("created_at", { ascending: true }),
      supabase
        .from("pbl_stages")
        .select("stage_number, status")
        .eq("task_id", id),
      supabase
        .from("pbl_outputs")
        .select("content, pending_items, version, updated_at")
        .eq("task_id", id)
        .eq("stage_number", stage)
        .maybeSingle(),
    ]);

  const statuses: Record<StageNumber, StageStatus> = {
    1: "not_started",
    2: "not_started",
    3: "not_started",
    4: "not_started",
    5: "not_started",
  };
  for (const s of stages ?? []) {
    const num = s.stage_number as StageNumber;
    statuses[num] = (s.status as StageStatus) ?? "not_started";
  }

  const meta = STAGE_META[stage];
  const messageCount = history?.length ?? 0;
  const isCompleted = statuses[stage] === "completed";
  const pendingItems = (output?.pending_items as string[] | null) ?? [];

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <Link
          href={`/tasks/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 과제로 돌아가기
        </Link>

        <StageStepper taskId={id} current={stage} statuses={statuses} />

        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{meta.subtitle}</p>
            <p className="mt-2 text-xs text-zinc-400">
              {task.title} · 경로: {task.ax_path?.toUpperCase() ?? "미판정"}
            </p>
          </div>
          <FinalizeButton
            taskId={id}
            stage={stage}
            disabled={messageCount < 2}
            hasOutput={Boolean(output)}
          />
        </header>

        {output && (
          <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                이 단계 산출물 · v{output.version}
              </h2>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                {new Date(output.updated_at).toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
              {output.content}
            </div>
            {pendingItems.length > 0 && (
              <div className="mt-4 rounded-md bg-emerald-100/60 p-3 dark:bg-emerald-900/40">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  아직 확답되지 않은 이슈
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs text-emerald-900 dark:text-emerald-200">
                  {pendingItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {isCompleted && stage < 5 && (
              <Link
                href={`/tasks/${id}/pbl/${stage + 1}`}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Stage {stage + 1}로 →
              </Link>
            )}
          </section>
        )}

        <PblChat
          taskId={id}
          stage={stage}
          initialHistory={
            history?.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            })) ?? []
          }
        />
      </div>
    </main>
  );
}
