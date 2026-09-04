"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChecklistItem } from "@/lib/gates/generate";

const CATEGORY_LABELS: Record<ChecklistItem["category"], { ko: string; cls: string }> = {
  readiness: {
    ko: "준비도",
    cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  risk: {
    ko: "위험",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  value: {
    ko: "가치",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  governance: {
    ko: "거버넌스",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
};

export function ChecklistRow({
  taskId,
  item,
  locked,
}: {
  taskId: string;
  item: ChecklistItem;
  locked: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(item.checked);
  const [pending, startTransition] = useTransition();

  function onToggle(next: boolean) {
    if (locked) return;
    setChecked(next); // optimistic
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/gate/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, checked: next }),
      });
      if (!res.ok) {
        setChecked(!next); // rollback
      } else {
        router.refresh();
      }
    });
  }

  const cat = CATEGORY_LABELS[item.category];

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={locked || pending}
        className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.cls}`}
          >
            {cat.ko}
          </span>
          <p
            className={`text-sm font-medium ${checked ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-50"}`}
          >
            {item.question}
          </p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">근거: {item.evidence_hint}</p>
      </div>
    </li>
  );
}
