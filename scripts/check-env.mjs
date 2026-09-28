/**
 * Staging environment check.
 *
 * Verifies the variables Horizons needs are present before a deploy goes out.
 * Only names are ever printed — values stay out of logs by construction.
 *
 * Usage: node scripts/check-env.mjs
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const RECOMMENDED = ["NEXT_PUBLIC_APP_URL"];

const OPTIONAL = ["RESEND_API_KEY", "EMAIL_FROM", "PAYSTACK_SECRET_KEY"];

function present(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 && !value.includes("your-") && !value.includes("example.com");
}

let failed = false;

for (const name of REQUIRED) {
  if (present(name)) {
    console.log(`✅ ${name} is set`);
  } else {
    failed = true;
    console.log(`❌ ${name} is missing or still a placeholder — the app cannot serve school data without it`);
  }
}

for (const name of RECOMMENDED) {
  console.log(`${present(name) ? "✅" : "⚠️"} ${name} ${present(name) ? "is set" : "is missing (link previews fall back to localhost)"}`);
}

for (const name of OPTIONAL) {
  if (!present(name)) console.log(`⚠️ ${name} is missing (its feature reports unconfigured until added)`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url && !url.startsWith("https://")) {
  failed = true;
  console.log("❌ NEXT_PUBLIC_SUPABASE_URL must start with https://");
}

if (failed) {
  console.error("Environment check failed.");
  process.exit(1);
}

console.log("Environment check passed.");
