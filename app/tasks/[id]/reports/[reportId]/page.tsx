import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RenderMarkdown } from "@/lib/reports/render";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: PageProps<"/tasks/[id]/reports/[reportId]">) {
  const { id, reportId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tasks/${id}/reports/${reportId}`);

  const { data: report } = await supabase
    .from("reports")
    .select("id, title, content, report_type, generated_at")
    .eq("id", reportId)
    .eq("task_id", id)
    .maybeSingle();

  if (!report) notFound();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/tasks/${id}/reports`}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 보고서 목록
        </Link>

        <header className="mt-4 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              {report.report_type}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(report.generated_at).toLocaleString("ko-KR")}
            </p>
          </div>
          <a
            href={`/api/tasks/${id}/reports/${reportId}/download`}
            className="shrink-0 inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            .md 다운로드
          </a>
        </header>

        <article className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
          <RenderMarkdown source={report.content ?? ""} />
        </article>
      </div>
    </main>
  );
}
