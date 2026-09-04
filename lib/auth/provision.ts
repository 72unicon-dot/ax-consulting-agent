import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

const DEFAULT_SANDBOX_COMPANY_NAME = "AX Consulting Sandbox";

export type ProvisionResult =
  | { ok: true; created: boolean; role: string; company_id: string | null }
  | { ok: false; reason: string };

/**
 * Ensure a public.users profile exists for the authenticated auth.user.
 *
 * Priority order:
 *   1. Row already exists → return it.
 *   2. First user in the system → super_admin, attached to the sandbox company.
 *   3. A valid invitation matches the email → use the invitation's role +
 *      company_id and mark the invitation as used.
 *   4. Fallback: attach as `member` of the sandbox company so any signed-in
 *      user can immediately use the app (create tasks, etc.). This is the
 *      relaxed behaviour requested in Phase 17 — admins can promote or
 *      reassign later from /admin/users.
 *
 * Idempotent: safe to call from any authenticated server page. Uses the
 * service-role client because users_insert RLS requires super_admin or
 * company_admin.
 */
export async function provisionProfileIfNeeded(
  user: User,
): Promise<ProvisionResult> {
  const admin = createServiceRoleClient();

  const { data: existing, error: existingErr } = await admin
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingErr) return { ok: false, reason: existingErr.message };
  if (existing) {
    return {
      ok: true,
      created: false,
      role: existing.role,
      company_id: existing.company_id,
    };
  }

  const email = user.email;
  if (!email) return { ok: false, reason: "email missing on auth user" };

  const { count, error: countErr } = await admin
    .from("users")
    .select("*", { count: "exact", head: true });
  if (countErr) return { ok: false, reason: countErr.message };

  const nameGuess =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    email.split("@")[0];

  // Look up (or create) the sandbox company once — used for both bootstrap
  // and fallback branches.
  const { data: sandboxRow } = await admin
    .from("companies")
    .select("id")
    .eq("name", DEFAULT_SANDBOX_COMPANY_NAME)
    .maybeSingle();
  let sandboxId = sandboxRow?.id ?? null;
  if (!sandboxId) {
    const { data: created } = await admin
      .from("companies")
      .insert({
        name: DEFAULT_SANDBOX_COMPANY_NAME,
        industry: "internal",
        status: "active",
      })
      .select("id")
      .single();
    sandboxId = created?.id ?? null;
  }

  // First user → super_admin.
  if ((count ?? 0) === 0) {
    const { error: insErr } = await admin.from("users").insert({
      id: user.id,
      email,
      name: nameGuess,
      role: "super_admin",
      company_id: sandboxId,
    });
    if (insErr) return { ok: false, reason: insErr.message };
    return {
      ok: true,
      created: true,
      role: "super_admin",
      company_id: sandboxId,
    };
  }

  // Invitation match.
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, role, company_id, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invitation) {
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

    return {
      ok: true,
      created: true,
      role: invitation.role,
      company_id: invitation.company_id,
    };
  }

  // Relaxed fallback: any signed-in user joins the sandbox company as member.
  const { error: insErr } = await admin.from("users").insert({
    id: user.id,
    email,
    name: nameGuess,
    role: "member",
    company_id: sandboxId,
  });
  if (insErr) return { ok: false, reason: insErr.message };

  return {
    ok: true,
    created: true,
    role: "member",
    company_id: sandboxId,
  };
}

/**
 * Convenience helper for server components: ensures the current auth user
 * has a profile row and returns the {role, company_id} pair the caller
 * needs to render the page or authorize an action.
 */
export async function ensureProfile(user: User) {
  const result = await provisionProfileIfNeeded(user);
  if (!result.ok) return null;
  return { role: result.role, company_id: result.company_id };
}
