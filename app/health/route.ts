import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail?: string };

export async function GET() {
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

  const allOk = checks.every((c) => c.ok);
  return Response.json(
    { ok: allOk, checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
