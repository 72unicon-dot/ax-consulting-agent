import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTaskAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: PageProps<"/tasks/new">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tasks/new");

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950">
          <h1 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
            소속 회사가 없습니다
          </h1>
          <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
            과제를 등록하려면 회사에 소속되어야 합니다. 관리자에게 문의하세요.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm font-medium text-rose-900 underline dark:text-rose-100"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← 대시보드
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            새 과제 등록
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            등록 후 AX 평가를 실행하여 rule/AI/재검토 경로를 판정합니다.
          </p>
        </header>

        <form action={createTaskAction} className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <Field
            name="title"
            label="제목"
            required
            placeholder="예: 재고 실사 편차 자동 알림"
          />
          <Field
            name="description"
            label="설명"
            textarea
            placeholder="어떤 문제/기회를 다루는 과제인지 짧게 설명"
          />
          <Field
            name="background"
            label="배경"
            textarea
            placeholder="이 과제를 하게 된 배경, 현재 상황, 관련된 부서"
          />
          <Field
            name="expected_effect"
            label="기대 효과"
            textarea
            placeholder="정량/정성 기대 효과. 예: 실사 오차 30% 감소"
          />

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              취소
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              등록
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  textarea,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const commonClass =
    "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={3}
          className={`${commonClass} min-h-[72px] resize-y`}
        />
      ) : (
        <input
          type="text"
          name={name}
          required={required}
          placeholder={placeholder}
          className={`h-10 ${commonClass}`}
        />
      )}
    </label>
  );
}
