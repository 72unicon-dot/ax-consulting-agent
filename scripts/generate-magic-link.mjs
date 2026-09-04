// One-shot script: uses the service-role key to generate a Supabase magic
// link + OTP for the given email — no email is sent, so rate limits don't apply.
//
// Usage:
//   node scripts/generate-magic-link.mjs [email]  (default: 72unicon@gmail.com)
//
// The script prints:
//   - the OTP (paste into /login "OTP 직접 입력" form)
//   - the action_link (open directly in the browser as a fallback)
//
// Requires .env.local at repo root with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY populated.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = process.argv[2] ?? "72unicon@gmail.com";
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "https://ax-consulting-agent.vercel.app";
const redirectTo = `${appUrl}/auth/callback?next=/dashboard`;

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo },
});

if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log("\n=== Supabase magic link generated ===");
console.log(`Email:       ${email}`);
console.log(`Expires:     ~1 hour`);
console.log(`OTP (6자리): ${data.properties?.email_otp ?? "(none)"}`);
console.log(`Action link: ${data.properties?.action_link ?? "(none)"}`);
console.log("");
console.log("Preferred flow: paste the OTP into the /login form (OTP 직접 입력).");
console.log("Fallback flow:  open the action link in a browser.");
