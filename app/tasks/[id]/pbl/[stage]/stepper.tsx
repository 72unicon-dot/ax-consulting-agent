import Link from "next/link";
import { STAGE_META, type StageNumber } from "@/lib/pbl/stage-prompts";

export type StageStatus = "not_started" | "in_progress" | "completed";

export function StageStepper({
  taskId,
  current,
  statuses,
}: {
  taskId: string;
  current: StageNumber;
  statuses: Record<StageNumber, StageStatus>;
}) {
  const stages: StageNumber[] = [1, 2, 3, 4, 5];

  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
      {stages.map((s) => {
        const status = statuses[s];
        const isCurrent = s === current;
        const done = status === "completed";
        const active = status === "in_progress";
        const clickable = done || active || s === current;

        const base =
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors";
        const cls = isCurrent
          ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : done
            ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
            : active
              ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              : "text-zinc-400";

        const label = STAGE_META[s].title.replace("Stage ", "S");
        const inner = (
          <>
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                done
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                    ? "bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
              }`}
            >
              {done ? "✓" : s}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </>
        );

        return clickable ? (
          <Link
            key={s}
            href={`/tasks/${taskId}/pbl/${s}`}
            className={`${base} ${cls}`}
          >
            {inner}
          </Link>
        ) : (
          <span key={s} className={`${base} ${cls} cursor-not-allowed`}>
            {inner}
          </span>
        );
      })}
    </nav>
  );
}
