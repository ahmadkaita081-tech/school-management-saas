# Staging Launch Runbook

Staging is where Horizons proves itself before any real school touches it: a
fresh Supabase project, all migrations, a deployed app, and two test schools
that cannot see each other. Work top to bottom; each step gates the next.

No real student data enters the system until step 6 passes.

## 0. Principles

- Staging and production are separate Supabase projects with separate keys.
- Test secrets on staging. Live secrets only in production, entered by hand.
- Secrets live in environment variables. They are never pasted into docs,
  chat logs, or the repository — CI refuses builds that contain them.

## 1. Create the Supabase project

1. Create a new project (the free tier is enough for staging).
2. Choose the region nearest Lagos for latency.
3. Open **Project Settings → API** and copy the project URL, `anon public`
   key and `service_role` key into a password manager — not into chat.

## 2. Apply the migrations in order

Via the Supabase CLI (recommended — it records what applied):

```bash
supabase link --project-ref YOUR_STAGING_REF
supabase db push
```

Or paste each file into the SQL editor in this exact order:

1. `202605290001_initial_school_os.sql`
2. `202605290002_database_intelligence_views.sql`
3. `202605290003_auth_profiles_and_roles.sql`
4. `202606060002_remove_demo_seed_data.sql`
5. `202606060003_setup_tables.sql`
6. `202606060004_invitations_and_permissions.sql`
7. `202606060005_portal_user_student_links.sql`
8. `202606060006_payments_and_receipts.sql`
9. `202606060007_result_publishing_locks.sql`
10. `202606060008_communication_delivery.sql`
11. `202606060009_strict_rls_and_audit.sql`
12. `202606060010_risk_scoring_views.sql`
13. `202606070001_monitoring_and_support.sql`
14. `202609220001_write_policies.sql`
15. `202609220002_finance_constraints.sql`

Confirm every migration reports success; a half-applied schema is worse
than none. If one fails, fix forward from that file — never skip.

## 3. Configure the environment

Set these on the staging deployment (Vercel → Project → Environment
Variables, Preview scope). See `.env.example` for the full reference.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Staging project URL, `https://…` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Staging service role; server only |
| `NEXT_PUBLIC_APP_URL` | Recommended | Staging URL, for metadata |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional | Email stays in unconfigured mode without them |
| `PAYSTACK_SECRET_KEY` | Optional | Use a **test** secret on staging |

Then run the environment check against the deployment:

```bash
node scripts/check-env.mjs
```

## 4. Deploy and smoke test

Deploy the `main` branch to the staging target, then:

```bash
BASE_URL=https://your-staging-url node scripts/smoke-test.mjs
```

Public pages must render, protected pages must bounce to login, and every
listed API must answer anonymous callers with 401. Any other result stops
the launch.

## 5. Create two test schools

Through the product itself (never raw SQL — the runbook must exercise the
real path):

1. Open `/login`, create owner account A, and complete setup: session,
   classes, a few students with admission numbers, one invoice.
2. In a private window, create owner account B with a different email and
   set up a second school the same way.

Both schools need at least students and invoices, or step 6 proves nothing.

## 6. Verify tenant isolation

```bash
SUPABASE_URL=https://your-staging.supabase.co \
SUPABASE_ANON_KEY=your-staging-anon-key \
TEST_A_EMAIL=owner-a@example.com TEST_A_PASSWORD=… \
TEST_B_EMAIL=owner-b@example.com TEST_B_PASSWORD=… \
node scripts/verify-isolation.mjs
```

The script signs in as each owner and asserts:

- each owner sees exactly one organisation across all core tables;
- the two organisations are different;
- a direct cross-tenant read by id returns zero rows.

If it fails, stop: do not onboard real schools until isolation passes.

## 7. Spot-check row level security

In the SQL editor, confirm the policies from the strict RLS migration
(step 2, item 11) are enforcing. As a sanity check,
run the app's own pages as owner A and confirm nothing from school B
appears in students, invoices, attendance, results or audit — then repeat
as owner B.

## 8. Retire the old project

The previous Supabase project URL exists in this repository's git history.
Once staging is green on the new project:

1. Delete the old project (or rotate every key on it).
2. Never reuse its URL or keys anywhere.

History rewrites are deliberately avoided: the old URL is useless once the
project is gone, while rewriting public history risks every checkout.

## 9. Go-live checklist

- [ ] Steps 1–7 pass on staging.
- [ ] A fresh production Supabase project exists with migrations applied.
- [ ] Production env vars are set (live Paystack secret, production Resend
      sender, production app URL).
- [ ] Smoke test passes against production.
- [ ] Isolation verification passes with two pilot schools.
- [ ] Backups and point-in-time recovery are enabled on production.
- [ ] The support contact on `/contact` is staffed.

Only then does the first real school sign up.
