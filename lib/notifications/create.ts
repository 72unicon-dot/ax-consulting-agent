import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type NotificationType =
  | "gate_submitted"
  | "gate_approved"
  | "gate_rejected"
  | "task_evaluated"
  | "report_ready";

export type NotificationInput = {
  user_id: string;
  type: NotificationType;
  message: string;
  task_id?: string | null;
};

/**
 * Creates notifications for the given users. Uses the service-role client
 * to bypass the notifications_own RLS policy, which only allows a user to
 * insert notifications for themselves.
 *
 * Best-effort: failures are logged but never bubble up — a notification
 * should never break the actual business operation that triggered it.
 */
export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  try {
    const admin = createServiceRoleClient();
    const rows = inputs.map((n) => ({
      user_id: n.user_id,
      type: n.type,
      message: n.message,
      task_id: n.task_id ?? null,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (error) {
      console.error("[notifications] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[notifications] unexpected:", e);
  }
}

/**
 * Notify all users with the given roles inside a company.
 */
export async function notifyCompanyRoles(
  companyId: string,
  roles: string[],
  payload: Omit<NotificationInput, "user_id">,
) {
  try {
    const admin = createServiceRoleClient();
    const { data: recipients } = await admin
      .from("users")
      .select("id")
      .eq("company_id", companyId)
      .in("role", roles)
      .eq("status", "active");
    if (!recipients || recipients.length === 0) return;
    await createNotifications(
      recipients.map((u) => ({ user_id: u.id, ...payload })),
    );
  } catch (e) {
    console.error("[notifications] role fanout failed:", e);
  }
}
