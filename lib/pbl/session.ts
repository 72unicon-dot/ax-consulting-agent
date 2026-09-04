import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { StageNumber } from "./stage-prompts";

type Client = SupabaseClient<Database>;

export async function ensureStageStarted(
  supabase: Client,
  taskId: string,
  stage: StageNumber,
) {
  const { data: existing } = await supabase
    .from("pbl_stages")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("stage_number", stage)
    .maybeSingle();

  if (existing) {
    if (existing.status === "not_started") {
      await supabase
        .from("pbl_stages")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("pbl_stages").insert({
    task_id: taskId,
    stage_number: stage,
    status: "in_progress",
    started_at: new Date().toISOString(),
  });
}

export async function loadHistory(
  supabase: Client,
  taskId: string,
  stage: StageNumber,
) {
  const { data } = await supabase
    .from("pbl_chat_messages")
    .select("id, role, content, created_at")
    .eq("task_id", taskId)
    .eq("stage_number", stage)
    .order("created_at", { ascending: true });
  return data ?? [];
}
