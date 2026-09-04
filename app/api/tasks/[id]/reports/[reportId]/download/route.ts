import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/reports/[reportId]/download">,
) {
  const { id: taskId, reportId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("title, content, generated_at")
    .eq("id", reportId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }

  const safeTitle = (report.title ?? "report")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  const dateSuffix = new Date(report.generated_at)
    .toISOString()
    .slice(0, 10);
  const filename = `${safeTitle || "report"}_${dateSuffix}.md`;

  return new Response(report.content ?? "", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
