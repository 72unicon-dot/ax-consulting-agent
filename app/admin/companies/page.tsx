import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyCreateForm, CompanyEditRow } from "./client";

export const dynamic = "force-dynamic";

export default async function CompaniesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/companies");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950">
          <h1 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
            접근 권한이 없습니다
          </h1>
          <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
            회사 관리는 super_admin만 사용할 수 있습니다.
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, industry, contact_name, contact_email, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 대시보드
        </Link>
        <header className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            회사 관리
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            컨설팅 대상 회사(고객사)를 등록·편집합니다.
          </p>
        </header>

        <section className="mt-8">
          <CompanyCreateForm />
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-zinc-500">
            등록된 회사 · {companies?.length ?? 0}건
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {(companies ?? []).map((c) => (
              <CompanyEditRow
                key={c.id}
                company={{
                  id: c.id,
                  name: c.name,
                  industry: c.industry,
                  contact_name: c.contact_name,
                  contact_email: c.contact_email,
                  status: c.status,
                }}
              />
            ))}
            {(companies?.length ?? 0) === 0 && (
              <li className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                아직 등록된 회사가 없습니다.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
