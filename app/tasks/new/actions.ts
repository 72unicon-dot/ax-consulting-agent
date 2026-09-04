"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/provision";

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const background = String(formData.get("background") ?? "").trim() || null;
  const expected_effect =
    String(formData.get("expected_effect") ?? "").trim() || null;

  if (!title) {
    redirect(`/tasks/new?error=${encodeURIComponent("제목은 필수입니다.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tasks/new");

  // Belt-and-suspenders: ensure profile exists before we read company_id.
  await ensureProfile(user);

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect(
      `/tasks/new?error=${encodeURIComponent("소속 회사가 없어 과제를 등록할 수 없습니다.")}`,
    );
  }

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      background,
      expected_effect,
      company_id: profile.company_id,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(
      `/tasks/new?error=${encodeURIComponent(error?.message ?? "등록 실패")}`,
    );
  }

  redirect(`/tasks/${inserted.id}`);
}
