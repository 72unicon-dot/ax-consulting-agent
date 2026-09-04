"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const ROLES_ALL = [
  "super_admin",
  "company_admin",
  "process_owner",
  "member",
] as const;

export function UserRow({
  user,
  self,
  isSuperViewer,
  companyName,
}: {
  user: User;
  self: boolean;
  isSuperViewer: boolean;
  companyName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roleOptions = isSuperViewer
    ? ROLES_ALL
    : ROLES_ALL.filter((r) => r !== "super_admin");
  const canChangeRole = !self && (isSuperViewer || user.role !== "super_admin");
  const canToggleStatus = !self && (isSuperViewer || user.role !== "super_admin");

  function patch(body: Partial<Pick<User, "role" | "status" | "name">>) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 px-5 py-4 ${user.status !== "active" ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {user.name}
            {self && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                나
              </span>
            )}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {user.email} · {companyName}
        </p>
        {error && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
      <select
        value={user.role}
        disabled={!canChangeRole || pending}
        onChange={(e) => patch({ role: e.target.value })}
        className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {roleOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canToggleStatus || pending}
        onClick={() =>
          patch({
            status: user.status === "active" ? "inactive" : "active",
          })
        }
        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {user.status === "active" ? "비활성화" : "활성화"}
      </button>
    </li>
  );
}
