"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "magic" | "otp";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "sent" } | { type: "error"; message: string }
  >({ type: "idle" });

  function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = new URL(
        `/auth/callback?next=${encodeURIComponent(next)}`,
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin,
      ).toString();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setStatus({ type: "error", message: error.message });
      } else {
        setStatus({ type: "sent" });
        router.refresh();
      }
    });
  }

  function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email",
      });
      if (error) {
        setStatus({ type: "error", message: error.message });
      } else {
        router.push(next);
        router.refresh();
      }
    });
  }

  const inputCls =
    "h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("magic");
            setStatus({ type: "idle" });
          }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "magic"
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          매직링크
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("otp");
            setStatus({ type: "idle" });
          }}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "otp"
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          OTP 직접 입력
        </button>
      </div>

      {mode === "magic" ? (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              이메일
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "전송 중..." : "매직링크 받기"}
          </button>
          {status.type === "sent" && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              메일함을 확인하고 링크를 클릭하세요.
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              이메일
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              OTP (6자리 코드)
            </span>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              className={`${inputCls} font-mono tracking-widest`}
            />
            <span className="text-[10px] text-zinc-500">
              관리자용: 서버에서 <code>scripts/generate-magic-link.mjs</code> 실행 시 발급된 코드
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "확인 중..." : "OTP로 로그인"}
          </button>
        </form>
      )}

      {status.type === "error" && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {status.message}
        </p>
      )}
    </div>
  );
}
