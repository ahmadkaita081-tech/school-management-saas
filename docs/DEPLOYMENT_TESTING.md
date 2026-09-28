# Deployment and Testing Guide

This guide explains how to deploy Horizons and test the full SaaS experience.

## Recommended Deployment Target

Use **Vercel** for the Next.js app and **Supabase** for database/auth.

Repository:

```txt
https://github.com/basgenix4u/school-management-saas
```

## 1. Supabase Setup Checklist

Already completed in the Supabase project:

- Initial database schema
- Product production records
- Database intelligence views
- Auth profile profile rows
- Product Supabase Auth users

Project metadata:

```txt
Project name: ALIMS Project
Project ref: xevoiljsumlqqamqkwla
Region: eu-central-1
```

## 2. Configure Supabase Auth Redirect URLs

In Supabase dashboard:

```txt
Authentication → URL Configuration
```

Set Site URL after deployment:

```txt
https://your-vercel-domain.vercel.app
```

Add redirect URLs:

```txt
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
https://your-custom-domain.com/auth/callback
```

## 3. Deploy on Vercel

### Option A — Vercel Dashboard

1. Go to https://vercel.com/new
2. Import GitHub repository:

```txt
basgenix4u/school-management-saas
```

3. Framework should auto-detect as Next.js.
4. Add environment variables listed below.
5. Click **Deploy**.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

## 4. Required Environment Variables on Vercel

Add these in:

```txt
Vercel Project → Settings → Environment Variables
```

Required for Supabase Auth and live APIs:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Recommended:

```txt
NEXT_PUBLIC_APP_URL
DEMO_BOOTSTRAP_SECRET
```

Optional/future:

```txt
RESEND_API_KEY
EMAIL_FROM
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
DATABASE_URL
AUTH_SECRET
AUTH_URL
```

Important:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public-client safe.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in browser code.
- Never commit real env values to GitHub.

## 5. Build Commands

Vercel should use:

```bash
npm install
npm run build
```

Local checks:

```bash
npm run lint
npm run build
npm run check
```

## 6. Smoke Testing

After deployment, run:

```bash
BASE_URL=https://your-vercel-domain.vercel.app npm run test:smoke
```

Or:

```bash
node scripts/smoke-test.mjs https://your-vercel-domain.vercel.app
```

The smoke test checks important pages and APIs.

## 7. Initial Access Credentials

Application users created in Supabase Auth:

```txt
       School Owner
   Principal
     Teacher
  Accountant
      Parent
     Student
```

Product password:

```txt

```

Security note: rotate/delete these before using real school data.

## 8. Manual QA Test Flow

### Public Pages

- Open `/`
- Open `/login`
- Confirm login page renders
- Confirm role selector works

### Authentication

- Login with ``
- Confirm redirect to `/dashboard`
- Confirm session badge appears
- Confirm sign out works

### Executive/Admin

Test:

```txt
/dashboard
/dashboard/intelligence
/dashboard/onboarding
/dashboard/database
/dashboard/launch
/dashboard/access
/dashboard/audit
/dashboard/trust
```

Expected:

- Pages render without error
- Command palette opens with `Ctrl+K` / `Cmd+K`
- Session badge appears
- Database page shows connected status when env variables are configured

### Student 360

Test:

```txt
/dashboard/students
/dashboard/students/amina-yusuf
/api/students
/api/students/STU-1001
```

Expected:

- Directory loads
- Profile loads
- API returns live data when the database is configured

### Attendance

Test:

```txt
/dashboard/teacher-desk
/dashboard/attendance/mark
/api/attendance
```

POST test example:

```bash
curl -X POST https://your-domain.com/api/attendance \
  -H "Content-Type: application/json" \
  -d '{"admissionNo":"STU-1001","status":"PRESENT","period":"Morning","note":"Smoke test"}'
```

### Finance

Test:

```txt
/dashboard/fees
/dashboard/fees/invoices
/dashboard/fees/INV-2026-001
/api/finance
/api/finance/invoices
/api/finance/invoices/INV-2026-001
```

POST invoice example:

```bash
curl -X POST https://your-domain.com/api/finance/invoices \
  -H "Content-Type: application/json" \
  -d '{"admissionNo":"STU-1001","invoiceNo":"INV-SMOKE-001","amount":50000,"status":"PENDING"}'
```

### Results

Test:

```txt
/dashboard/results
/dashboard/results/entry
/dashboard/results/report-card/amina-yusuf
/api/results
/api/results/STU-1001
```

POST result example:

```bash
curl -X POST https://your-domain.com/api/results \
  -H "Content-Type: application/json" \
  -d '{"admissionNo":"STU-1001","subjectName":"Physics","term":"Second Term","session":"2025/2026","caScore":30,"examScore":58,"status":"APPROVED"}'
```

### Parent and Student Portals

Test:

```txt
/portal/parent
/portal/student
/api/portal/parent
/api/portal/student
```

Expected:

- If authenticated and env configured, protected routes should load after login.
- If not authenticated, redirects to `/login`.

### Communications

Test:

```txt
/dashboard/communications
/dashboard/communications/campaigns
/api/communications
```

Expected:

- Campaign board renders
- Communication templates and insights render

## 9. GitHub Actions

The repo includes CI:

```txt
.github/workflows/ci.yml
```

It runs:

```bash
npm ci
npm run lint
npm run build
```

## 10. Production Security Checklist

Before using real school data:

- Rotate all shared tokens.
- Rotate product password.
- Delete or disable application users.
- Replace product RLS policies with strict org-scoped policies.
- Confirm service role key exists only on the server.
- Add audit logs to every mutation.
- Add rate limiting to public APIs.
- Enable custom domain and HTTPS.
- Configure backups.
- Test password reset and email verification.

## 11. Recommended Next Deployment Milestone

1. Deploy to Vercel.
2. Add Vercel env variables.
3. Add Vercel URL to Supabase Auth redirect URLs.
4. Login with access credentials.
5. Run smoke test.
6. Record screenshots and product video.
7. Add live product link to GitHub README.


## Paystack Payment Setup

Add these Vercel environment variables before enabling online payments:

```txt
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
```

In Paystack dashboard, configure webhook URL:

```txt
https://your-vercel-domain.vercel.app/api/payments/paystack/webhook
```

Payment test flow:

1. Create a school profile.
2. Add a student.
3. Create an invoice for that student.
4. Open `/dashboard/fees/[invoiceNo]`.
5. Enter payer email and initialize Paystack payment.
6. Paystack redirects to receipt page after successful payment.
7. Webhook/verify API records payment and receipt.

Payment APIs:

```txt
POST /api/payments/paystack/initialize
POST /api/payments/paystack/verify
POST /api/payments/paystack/webhook
GET  /api/receipts/[reference]
```


## Resend Email Setup

Add these Vercel environment variables before enabling email delivery:

```txt
RESEND_API_KEY
EMAIL_FROM
```

Recommended `EMAIL_FROM` format:

```txt
Horizons <noreply@yourdomain.com>
```

Communication APIs:

```txt
GET  /api/communications
POST /api/communications
POST /api/communications/send
```

Email test flow:

1. Create a school profile in `/dashboard/setup`.
2. Open `/dashboard/communications`.
3. Create an announcement.
4. Add recipient emails.
5. Send email.
6. Confirm delivery records appear in the communication log.
