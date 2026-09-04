"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ExtractButton({
  taskId,
  hasKpis,
}: {
  taskId: string;
  hasKpis: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      hasKpis &&
      !window.confirm(
        "이미 등록된 KPI가 있습니다. 추출된 KPI가 추가로 삽입됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/kpis/extract`, {
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
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending
          ? "추출 중..."
          : hasKpis
            ? "KPI 다시 추출"
            : "산출물에서 KPI 자동 추출"}
      </button>
    </div>
  );
}

const CATEGORIES = ["business", "ai", "system", "cost", "adoption"] as const;

export function AddKpiForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("business");
  const [unit, setUnit] = useState("");
  const [baseline, setBaseline] = useState("");
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setUnit("");
    setBaseline("");
    setTarget("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${taskId}/kpis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpi_name: name,
          kpi_category: category,
          unit,
          baseline: baseline === "" ? null : Number(baseline),
          target_value: target === "" ? null : Number(target),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        + KPI 직접 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            KPI 이름 <span className="text-rose-500">*</span>
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            카테고리
          </span>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof CATEGORIES)[number])
            }
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            단위
          </span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="%, 건/일, 원..."
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Baseline (as-is)
          </span>
          <input
            type="number"
            step="any"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Target (to-be)
          </span>
          <input
            type="number"
            step="any"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:text-zinc-300"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {pending ? "저장 중..." : "추가"}
        </button>
      </div>
    </form>
  );
}

export function MeasurementInput({
  kpiId,
  initial,
}: {
  kpiId: string;
  initial: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function onSave() {
    startTransition(async () => {
      const res = await fetch(`/api/kpi-records/${kpiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_value: value === "" ? null : Number(value),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="측정값"
        className="h-8 w-24 rounded-md border border-zinc-300 bg-white px-2 text-right font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {pending ? "..." : saved ? "✓" : "저장"}
      </button>
    </div>
  );
}

export function DeleteKpiButton({ kpiId }: { kpiId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm("이 KPI를 삭제할까요?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/kpi-records/${kpiId}`, {
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
