import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "task_files";
const MAX_BYTES = 25 * 1024 * 1024;

function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").trim();
  const collapsed = trimmed.replace(/\s+/g, "_");
  const kept = collapsed.replace(/[^\p{L}\p{N}._-]/gu, "");
  return kept.slice(0, 80) || "file";
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/tasks/[id]/files">,
) {
  const { id: taskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "빈 파일은 업로드할 수 없습니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일 크기가 ${MAX_BYTES / (1024 * 1024)}MB를 초과합니다.` },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const fileId = randomUUID();
  const safeName = safeFilename(file.name || "file");
  const objectPath = `${taskId}/${fileId}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: `업로드 실패: ${upErr.message}` },
      { status: 500 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("task_files")
    .insert({
      task_id: taskId,
      file_name: file.name || safeName,
      file_path: objectPath,
      file_size: file.size,
      file_type: file.type || null,
      uploaded_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    // best-effort cleanup of the storage object so we don't leave orphans
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => {});
    return NextResponse.json(
      { error: insErr?.message ?? "메타 저장 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, file_id: inserted.id });
}
