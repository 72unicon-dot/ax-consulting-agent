import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";
import { PblChat } from "./chat";

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

  const { data: history } = await supabase
    .from("pbl_chat_messages")
    .select("id, role, content, created_at")
    .eq("task_id", id)
    .eq("stage_number", stage)
    .order("created_at", { ascending: true });

  const meta = STAGE_META[stage];

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <header className="mb-6">
          <Link
            href={`/tasks/${id}`}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← 과제로 돌아가기
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{meta.subtitle}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {task.title} · 경로: {task.ax_path?.toUpperCase() ?? "미판정"}
          </p>
        </header>

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
