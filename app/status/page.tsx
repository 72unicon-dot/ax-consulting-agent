import Link from "next/link";

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail?: string };
type HealthPayload = {
  ok: boolean;
  checks: Check[];
  timestamp: string;
};

async function fetchHealth(deep: boolean): Promise<HealthPayload | null> {
  // Build the absolute URL from headers so we hit this same deployment
  // even before NEXT_PUBLIC_APP_URL is authoritative.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(`/health${deep ? "?deep=1" : ""}`, base).toString();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    return (await res.json()) as HealthPayload;
  } catch {
    return null;
  }
}

const LABELS: Record<string, string> = {
  "env.NEXT_PUBLIC_SUPABASE_URL": "Supabase URL 환경변수",
  "env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "Supabase Anon Key 환경변수",
  "env.SUPABASE_SERVICE_ROLE_KEY": "Supabase Service Role Key 환경변수",
  "env.ANTHROPIC_API_KEY": "Anthropic API Key 환경변수",
  "env.ANTHROPIC_WORKSPACE_ID": "Anthropic Workspace ID 환경변수",
  "supabase.auth.getUser": "Supabase 인증 세션 확인",
  "anthropic.messages.create": "Claude Opus 5 실제 호출",
};

export default async function StatusPage({
  searchParams,
}: PageProps<"/status">) {
  const params = await searchParams;
  const deep = params.deep === "1";
  const payload = await fetchHealth(deep);

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 홈으로
        </Link>

        <header className="mt-4 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            시스템 상태
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {payload
              ? new Date(payload.timestamp).toLocaleString("ko-KR")
              : "확인 중..."}
          </p>
        </header>

        {!payload ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
            상태 확인 API에 도달하지 못했습니다.
          </div>
        ) : (
          <>
            <div
              className={`mb-6 rounded-2xl border p-5 ${
                payload.ok
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                  : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
                    payload.ok
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {payload.ok ? "✓" : "✗"}
                </span>
                <div>
                  <p
                    className={`text-lg font-semibold ${
                      payload.ok
                        ? "text-emerald-900 dark:text-emerald-100"
                        : "text-rose-900 dark:text-rose-100"
                    }`}
                  >
                    {payload.ok ? "모든 시스템 정상" : "일부 시스템 이상"}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {payload.checks.filter((c) => c.ok).length}/
                    {payload.checks.length} 통과
                  </p>
                </div>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {payload.checks.map((c) => (
                <li
                  key={c.name}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      c.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {c.ok ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {LABELS[c.name] ?? c.name}
                    </p>
                    {c.detail && (
                      <p className="mt-0.5 break-words text-xs text-zinc-500">
                        {c.detail}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                      {c.name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-2 text-xs text-zinc-500">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={deep ? "/status" : "/status?deep=1"}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {deep ? "빠른 확인만" : "Claude 실제 호출까지 심층 진단 →"}
                </Link>
                <a
                  href={`/health${deep ? "?deep=1" : ""}`}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  JSON 원본 보기
                </a>
              </div>
              <p>
                이 페이지는 <code>/health</code> 엔드포인트를 사람 친화적으로
                표시합니다. 자동화 스크립트는 <code>/health</code>를 직접 호출해
                JSON을 사용하세요.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
