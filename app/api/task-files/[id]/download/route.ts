import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "task_files";

export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/task-files/[id]/download">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("task_files")
    .select("file_path, file_name, file_type")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.file_path, 60, {
      download: row.file_name || undefined,
    });
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message ?? "signed url 생성 실패" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}
