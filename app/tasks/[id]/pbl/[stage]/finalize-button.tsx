"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function FinalizeButton({
  taskId,
  stage,
  disabled,
  hasOutput,
}: {
  taskId: string;
  stage: number;
  disabled: boolean;
  hasOutput: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      hasOutput &&
      !window.confirm(
        "이 단계 산출물이 이미 있습니다. 다시 정리하면 새 버전으로 대체됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/tasks/${taskId}/pbl/${stage}/finalize`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as {
        ok: boolean;
        next_stage: number | null;
      };
      if (body.next_stage) {
        router.push(`/tasks/${taskId}/pbl/${body.next_stage}`);
      } else {
        router.refresh();
      }
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
        disabled={disabled || pending}
        className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending
          ? "정리 중..."
          : hasOutput
            ? "다시 정리"
            : `Stage ${stage} 완료 & 다음으로`}
      </button>
    </div>
  );
}
