"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-emerald-700 underline hover:text-emerald-900 disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
    >
      {pending ? "..." : "읽음 처리"}
    </button>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await fetch(`/api/notifications/read-all`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? "..." : "모두 읽음"}
    </button>
  );
}
