import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "task_files";

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext<"/api/task-files/[id]">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error: selErr } = await supabase
    .from("task_files")
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  const { error: delRowErr } = await supabase
    .from("task_files")
    .delete()
    .eq("id", id);
  if (delRowErr) {
    return NextResponse.json({ error: delRowErr.message }, { status: 500 });
  }

  await supabase.storage
    .from(BUCKET)
    .remove([row.file_path])
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
