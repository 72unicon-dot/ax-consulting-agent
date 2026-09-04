import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionProfileIfNeeded } from "@/lib/auth/provision";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("missing auth code")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await provisionProfileIfNeeded(user);
    if (!result.ok) {
      // Provisioning is now permissive (falls back to sandbox+member), so
      // a real failure here means a DB/RLS problem, not a policy denial.
      // Surface the error but do not sign the user out — they can retry
      // from /dashboard where provisioning also runs on demand.
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(result.reason)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
