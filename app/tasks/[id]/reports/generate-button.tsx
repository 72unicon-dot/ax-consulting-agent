"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function GenerateReportButton({
  taskId,
  hasReports,
  gateApproved,
}: {
  taskId: string;
  hasReports: boolean;
  gateApproved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      !gateApproved &&
      !window.confirm(
        "Gate 5가 아직 승인되지 않았습니다. 그래도 초안 보고서를 만들까요?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/reports/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { report_id: string };
      router.push(`/tasks/${taskId}/reports/${body.report_id}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending
          ? "생성 중..."
          : hasReports
            ? "새 보고서 생성"
            : "최종 보고서 생성"}
      </button>
    </div>
  );
}
