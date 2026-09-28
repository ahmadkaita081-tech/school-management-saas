# Horizons — School Management Platform

Horizons is a multi-tenant school management platform built for Nigerian institutions —
primary and secondary schools, colleges, polytechnics and universities. It replaces paper
registers, scattered spreadsheets and ad-hoc messaging with one system for admissions,
attendance, results, fees and parent communication.

**Author:** Ahmad Yandaki

- GitHub: https://github.com/basgenix4u
- Website: https://alimswrite.com

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## The problem

Nigerian schools lose time and money to administration that runs on paper. Attendance sits in
hardcover registers, results are compiled by hand each term, fee balances live in a bursar's
spreadsheet, and parents learn about arrears when a child is sent home. Existing software is
usually priced for Western schools, assumes reliable broadband, and does not model Nigerian
academic structure.

Horizons is built for the way Nigerian schools actually operate: terms and sessions rather than
semesters, continuous assessment alongside examinations, naira invoicing with Paystack, and a
mobile-first parent experience that works on a modest phone and an intermittent connection.

---

## Built for Nigerian institutions

- **Academic structure** — three terms per session, sessions written `2025/2026`, CA and exam
  score components, class structures from nursery through tertiary.
- **Roles that match a real school** — Proprietor, Principal, Teacher, Bursar, Parent, Student.
- **Naira throughout** — invoices, receipts and reports all in `₦`, never bare numbers.
- **Low-bandwidth first** — server-rendered pages, no webfont downloads, small payloads.
- **Phone-number tolerant** — accepts `08031234567`, `+234 803 123 4567` or `234-803-123-4567`
  and stores one normalised form.

---

## Architecture

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4 with a token-based design system |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth with cookie sessions |
| Authorisation | Role-based permissions plus PostgreSQL row level security |
| Payments | Paystack |
| Email | Resend |
| Documents | PDFKit for report cards and receipts |

### Security model

Authorisation is enforced at three independent layers, so no single mistake exposes data:

1. **Proxy** (`proxy.ts`) — establishes a session and blocks anonymous access to `/dashboard`
   and `/portal`.
2. **Application** — `withAuth(permission, handler)` guards every route handler, and the
   dashboard layout checks the permission required for the requested area. Both deny by default.
3. **Database** — row level security scopes every row to the caller's school. Requests use a
   session-scoped client, so a forgotten filter cannot leak another school's records.

The service role key bypasses row level security and is therefore restricted to contexts with
no user session: Paystack webhooks, invitation acceptance and first-owner setup. CI fails the
build if it appears anywhere else.

---

## Getting started

### Prerequisites

- Node.js 22 or newer
- A Supabase project

### 1. Install

```bash
git clone https://github.com/basgenix4u/school-management-saas.git
cd school-management-saas
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`. Paystack and Resend keys are optional in development; without
them the related features report that they are unconfigured rather than failing.

### 3. Apply database migrations

Run the files in `supabase/migrations/` in filename order against your Supabase project, using
the SQL editor or the Supabase CLI. They are the single source of truth for the schema,
including row level security policies, triggers and reporting views.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

### Verify before pushing

```bash
npm run check   # lint, typecheck, tests, production build
```

---

## Project structure

```txt
app/                  Routes, pages and API handlers
  api/                Route handlers, each guarded by withAuth
  dashboard/          Staff workspace; layout enforces per-area permissions
  portal/             Parent and student portals
components/           UI components grouped by domain
lib/
  auth/               Session, permissions and the API authorisation guard
  supabase/           Request-scoped and service-role clients, data access
  format.ts           Naira, date, phone and academic session formatting
  rbac.ts             Roles and permissions
supabase/migrations/  Schema, row level security, triggers and views
tests/                Authorisation, role boundary and formatting tests
docs/                 Architecture, design system and operational guides
```

---

## Testing

```bash
npm run test        # authorisation coverage, role boundaries, formatting
npm run test:smoke  # HTTP smoke test against a running instance
```

The security suite asserts that every route handler authorises unless it appears on an
explicit, documented public list, and that user-facing routes never use the row-level-security
bypass. Adding an unguarded endpoint fails the build.

---

## Documentation

| Document | Purpose |
| --- | --- |
| `docs/ARCHITECTURE.md` | System design and data flow |
| `docs/AUTH_RBAC.md` | Authentication and the permission matrix |
| `docs/DESIGN_SYSTEM.md` | Tokens, typography, colour and components |
| `docs/SUPABASE_SETUP.md` | Database provisioning and migrations |
| `docs/DEPLOYMENT_TESTING.md` | Deployment and QA procedure |
| `docs/REMAINING_FEATURES.md` | Product roadmap |

---

## Roadmap

Delivered: authentication, role-based authorisation, row level security, student records,
attendance, results with report card PDFs, fee invoicing, Paystack payments with receipts,
parent and student portals, announcements, audit logging and the setup wizard.

Next: teacher timetables, period-based attendance, bulk result import, SMS reminders,
subscription billing for schools, and an offline-tolerant attendance mode.

---

## Security

Report vulnerabilities privately using the process in [SECURITY.md](./SECURITY.md).
Never commit `.env` files or service role keys.

## Licence

MIT — see [LICENSE](./LICENSE).
