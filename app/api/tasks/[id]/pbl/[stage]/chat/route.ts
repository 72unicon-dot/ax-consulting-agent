import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import {
  getStageSystemPrompt,
  type StageNumber,
} from "@/lib/pbl/stage-prompts";
import { ensureStageStarted, loadHistory } from "@/lib/pbl/session";
import type Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID_STAGES: readonly StageNumber[] = [1, 2, 3, 4, 5];

function sseEvent(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/pbl/[stage]/chat">,
) {
  const { id: taskId, stage: stageParam } = await params;
  const stage = Number(stageParam) as StageNumber;
  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "invalid stage" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { message?: string }
    | null;
  const userMessage = body?.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, title, description, background, expected_effect, ax_path")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  await ensureStageStarted(supabase, taskId, stage);

  const historyRows = await loadHistory(supabase, taskId, stage);

  const { error: userInsErr } = await supabase
    .from("pbl_chat_messages")
    .insert({
      task_id: taskId,
      stage_number: stage,
      role: "user",
      content: userMessage,
    });
  if (userInsErr) {
    return NextResponse.json({ error: userInsErr.message }, { status: 500 });
  }

  const messages: Anthropic.MessageParam[] = [
    ...historyRows.map(
      (r): Anthropic.MessageParam => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: r.content,
      }),
    ),
    { role: "user", content: userMessage },
  ];

  const system = getStageSystemPrompt(stage, task);
  const anthropic = getAnthropicClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const runner = anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system,
          messages,
        });

        for await (const event of runner) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                sseEvent({ type: "delta", text: event.delta.text }),
              ),
            );
          }
        }

        const finalMsg = await runner.finalMessage();
        const assistantText = finalMsg.content
          .filter(
            (b): b is Anthropic.TextBlock => b.type === "text",
          )
          .map((b) => b.text)
          .join("");

        if (assistantText) {
          await supabase.from("pbl_chat_messages").insert({
            task_id: taskId,
            stage_number: stage,
            role: "assistant",
            content: assistantText,
          });
        }

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "done",
              stop_reason: finalMsg.stop_reason,
              input_tokens: finalMsg.usage.input_tokens,
              output_tokens: finalMsg.usage.output_tokens,
            }),
          ),
        );
        controller.close();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message })),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
