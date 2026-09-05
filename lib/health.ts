import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

export type HealthCheck = { name: string; ok: boolean; detail?: string };
export type HealthReport = {
  ok: boolean;
  checks: HealthCheck[];
  timestamp: string;
};

/**
 * Runs the same set of health checks used by `/health` (JSON) and
 * `/status` (rendered UI). Kept as a single source of truth so the two
 * routes never drift apart, and so the UI page never has to make an
 * HTTP hop back into its own deployment (which is fragile on Vercel).
 */
export async function runHealthChecks(deep: boolean): Promise<HealthReport> {
  const checks: HealthCheck[] = [];

  checks.push({
    name: "env.NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
  checks.push({
    name: "env.NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
  checks.push({
    name: "env.SUPABASE_SERVICE_ROLE_KEY",
    ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
  checks.push({
    name: "env.ANTHROPIC_API_KEY",
    ok: Boolean(process.env.ANTHROPIC_API_KEY),
  });
  checks.push({
    name: "env.ANTHROPIC_WORKSPACE_ID",
    ok: true,
    detail: process.env.ANTHROPIC_WORKSPACE_ID
      ? "set"
      : "unset (ok if key is workspace-scoped)",
  });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    const noSession = error?.message === "Auth session missing!";
    checks.push({
      name: "supabase.auth.getUser",
      ok: !error || noSession,
      detail: noSession
        ? "no active session (ok)"
        : error?.message ?? `user: ${data.user?.id ?? "none"}`,
    });
  } catch (e) {
    checks.push({
      name: "supabase.auth.getUser",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  if (deep) {
    try {
      const client = getAnthropicClient();
      const r = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 20,
        messages: [{ role: "user", content: "reply with one word: pong" }],
      });
      const text = r.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      checks.push({
        name: "anthropic.messages.create",
        ok: text.length > 0,
        detail: `${r.model}: "${text}" (in=${r.usage.input_tokens} out=${r.usage.output_tokens})`,
      });
    } catch (e) {
      const err = e as { status?: number; message?: string };
      checks.push({
        name: "anthropic.messages.create",
        ok: false,
        detail: `${err.status ?? "?"}: ${err.message ?? String(e)}`,
      });
    }
  }

  return {
    ok: checks.every((c) => c.ok),
    checks,
    timestamp: new Date().toISOString(),
  };
}
