import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const message = typeof params.message === "string" ? params.message : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            AX Consulting Agent
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            이메일로 로그인 링크를 받아 접속합니다.
          </p>
        </header>

        <LoginForm next={next} />

        {message && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
