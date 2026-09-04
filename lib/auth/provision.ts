import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

const DEFAULT_SANDBOX_COMPANY_NAME = "AX Consulting Sandbox";

export type ProvisionResult =
  | { ok: true; created: boolean; role: string }
  | { ok: false; reason: string };

/**
 * Ensure a public.users profile exists for the authenticated auth.user.
 * - First user in the system → super_admin, attached to the sandbox company.
 * - Otherwise → look up the most recent valid invitation for this email.
 * - No match → refuse; caller should sign the user out and show an error.
 */
export async function provisionProfileIfNeeded(
  user: User,
): Promise<ProvisionResult> {
  const admin = createServiceRoleClient();

  const { data: existing, error: existingErr } = await admin
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (existingErr) return { ok: false, reason: existingErr.message };
  if (existing) return { ok: true, created: false, role: existing.role };

  const email = user.email;
  if (!email) return { ok: false, reason: "email missing on auth user" };

  const { count, error: countErr } = await admin
    .from("users")
    .select("*", { count: "exact", head: true });
  if (countErr) return { ok: false, reason: countErr.message };

  const nameGuess = email.split("@")[0];

  if ((count ?? 0) === 0) {
    const { data: sandbox } = await admin
      .from("companies")
      .select("id")
      .eq("name", DEFAULT_SANDBOX_COMPANY_NAME)
      .maybeSingle();

    const { error: insErr } = await admin.from("users").insert({
      id: user.id,
      email,
      name: nameGuess,
      role: "super_admin",
      company_id: sandbox?.id ?? null,
    });
    if (insErr) return { ok: false, reason: insErr.message };
    return { ok: true, created: true, role: "super_admin" };
  }

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, role, company_id, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) {
    return {
      ok: false,
      reason: "초대되지 않은 이메일입니다. 관리자에게 초대를 요청하세요.",
    };
  }

  const { error: insErr } = await admin.from("users").insert({
    id: user.id,
    email,
    name: nameGuess,
    role: invitation.role,
    company_id: invitation.company_id,
  });
  if (insErr) return { ok: false, reason: insErr.message };

  await admin
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { ok: true, created: true, role: invitation.role };
}
