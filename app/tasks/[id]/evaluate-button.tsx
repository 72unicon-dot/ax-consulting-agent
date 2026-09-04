"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function EvaluateButton({
  taskId,
  hasEvaluation,
}: {
  taskId: string;
  hasEvaluation: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/evaluate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending
          ? "평가 중..."
          : hasEvaluation
            ? "재평가"
            : "AX 평가 실행"}
      </button>
    </div>
  );
}
