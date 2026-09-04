"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function FileUploadButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function onChoose() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file
    setError(null);
    setProgress(`업로드 중: ${file.name}`);

    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/files`, {
        method: "POST",
        body: form,
      });
      setProgress(null);
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
      {progress && (
        <span className="text-xs text-zinc-500">{progress}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        onChange={onFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={onChoose}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {pending ? "업로드 중..." : "+ 파일 첨부"}
      </button>
    </div>
  );
}

export function DeleteFileButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm("이 파일을 삭제할까요?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/task-files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-zinc-400 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
    >
      {pending ? "..." : "삭제"}
    </button>
  );
}
