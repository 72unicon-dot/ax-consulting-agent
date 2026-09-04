"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SubmitForReview({
  taskId,
  disabled,
}: {
  taskId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/gate/submit`, {
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
    <div className="flex flex-col items-end gap-1">
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "요청 중..." : "승인 요청"}
      </button>
    </div>
  );
}

export function ReviewForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "approve" | "reject") {
    if (decision === "reject" && !comment.trim()) {
      setError("반려 시 사유(코멘트)는 필수입니다.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/gate/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        게이트 검토 (관리자)
      </h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="코멘트(반려 시 필수)"
        disabled={pending}
        className="mt-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => decide("reject")}
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md border border-rose-300 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
        >
          반려
        </button>
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          승인
        </button>
      </div>
    </div>
  );
}
