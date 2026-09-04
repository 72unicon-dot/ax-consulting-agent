import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarkReadButton, MarkAllReadButton } from "./client";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { ko: string; tone: string }> = {
  gate_submitted: {
    ko: "게이트 승인 요청",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  gate_approved: {
    ko: "게이트 승인",
    tone:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  gate_rejected: {
    ko: "게이트 반려",
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  task_evaluated: {
    ko: "AX 평가 완료",
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  report_ready: {
    ko: "보고서 생성",
    tone:
      "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, task_id, message, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 대시보드
        </Link>

        <header className="mt-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              알림
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              미확인 {unreadCount}건 / 최근 {notifications?.length ?? 0}건
            </p>
          </div>
          {unreadCount > 0 && <MarkAllReadButton />}
        </header>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {notifications && notifications.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {notifications.map((n) => {
                const meta =
                  TYPE_META[n.type] ?? {
                    ko: n.type,
                    tone:
                      "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                  };
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 ${
                      n.is_read
                        ? "opacity-60"
                        : "bg-emerald-50/40 dark:bg-emerald-950/20"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}
                    >
                      {meta.ko}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-900 dark:text-zinc-50">
                        {n.message}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span>
                          {new Date(n.created_at).toLocaleString("ko-KR")}
                        </span>
                        {n.task_id && (
                          <Link
                            href={`/tasks/${n.task_id}`}
                            className="text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                          >
                            과제 열기
                          </Link>
                        )}
                        {!n.is_read && <MarkReadButton id={n.id} />}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              알림이 없습니다.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
