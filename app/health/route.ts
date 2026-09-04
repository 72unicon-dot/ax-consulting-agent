import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";

  const checks: Check[] = [];

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

  // Deep probe: actually round-trip to Anthropic. Off by default so /health
  // stays cheap; hit /health?deep=1 to run this.
  if (deep) {
    try {
      const client = getAnthropicClient();
      const r = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 20,
        messages: [{ role: "user", content: "reply with one word: pong" }],
      });
      const text = r.content
        .filter((b): b is { type: "text"; text: string; citations: null } =>
          b.type === "text",
        )
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

  const allOk = checks.every((c) => c.ok);
  return Response.json(
    { ok: allOk, checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
