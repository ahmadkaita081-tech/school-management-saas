# Authentication and RBAC Architecture

Horizons is designed for role-aware SaaS access across multiple schools.

## Roles

- `SUPER_ADMIN`: SaaS platform owner
- `SCHOOL_OWNER`: school proprietor/director
- `PRINCIPAL`: academic and operations lead
- `TEACHER`: classroom workflow user
- `ACCOUNTANT`: fees and payment user
- `PARENT`: parent portal user
- `STUDENT`: student portal user

## Permission Model

The permission model lives in `lib/rbac.ts` and maps every role to explicit permissions such as:

- `workspace.manage`
- `analytics.view`
- `students.manage`
- `teachers.manage`
- `attendance.mark`
- `results.manage`
- `fees.manage`
- `audit.view`

## Current Implementation

The current repository includes:

- Premium login UX at `/login`
- Role access matrix at `/dashboard/access`
- Product auth architecture API at `/api/product-auth`
- Type-safe role and permission definitions
- Role-specific workspace previews

## Production Implementation Plan

1. Add real authentication provider: Auth.js, Clerk or Supabase Auth.
2. Store users with `organizationId` and role.
3. Create route-level guards.
4. Add server-side permission checks for every mutation.
5. Add audit logs for sensitive operations.
6. Add session-aware dashboard redirects.
7. Add invitation flow for staff, parents and students.

## Security Requirement

Never rely only on client-side role checks. Every protected database query and mutation must validate:

- authenticated user
- organization membership
- role permission
- resource ownership/scope


## Supabase Auth Implementation

The app now includes a Supabase Auth foundation:

```txt
/login
/auth/callback
/api/auth/session
/api/auth/sign-out
/api/auth/bootstrap-product-user
```

Middleware protects:

```txt
/dashboard/*
/portal/*
```

If Supabase public environment variables are missing, the app runs in configuration mode so local builds and portfolio previews do not break.

## Product Users

The migration `202605290003_auth_profiles_and_roles.sql` seeds app profile rows for:

```txt
       SCHOOL_OWNER
   PRINCIPAL
     TEACHER
  ACCOUNTANT
      PARENT
     STUDENT
```

Create matching Supabase Auth users from the Supabase dashboard or through the guarded bootstrap endpoint.

## Bootstrap Endpoint

```txt
POST /api/auth/bootstrap-product-user
Header: x-bootstrap-secret: <DEMO_BOOTSTRAP_SECRET>
Body: { "email": "", "password": "" }
```

This endpoint requires `SUPABASE_SERVICE_ROLE_KEY` and must be disabled or protected in production.

## Production Requirement

Before real launch:

1. Configure Supabase Auth redirect URLs.
2. Create staff/parent/student invite flows.
3. Link `auth.users.id` to `app_users.auth_user_id`.
4. Replace product policies with strict organization-scoped RLS.
5. Enforce permission checks on every mutation.


## Initial Access Credentials

The Supabase Auth users were created and linked to `app_users` profiles for the school.

All application users currently use this password:

```txt

```

Product emails:

```txt
       School Owner
   Principal
     Teacher
  Accountant
      Parent
     Student
```

Rotate or delete these users before using the project with real school data.
