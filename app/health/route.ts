import { runHealthChecks } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";
  const report = await runHealthChecks(deep);
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
