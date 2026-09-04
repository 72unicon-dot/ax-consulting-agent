"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function GenerateGateButton({
  taskId,
  hasGate,
}: {
  taskId: string;
  hasGate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      hasGate &&
      !window.confirm(
        "기존 체크리스트가 대체되고 검토 상태가 초기화됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/gate/generate`, {
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
    <div className="flex items-center gap-2">
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
          : hasGate
            ? "체크리스트 재생성"
            : "체크리스트 자동 생성"}
      </button>
    </div>
  );
}
