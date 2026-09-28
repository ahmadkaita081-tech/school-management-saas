# Horizons Architecture

## Application Type

Horizons is designed as a multi-tenant SaaS platform for schools and training institutions.

## Core Domains

1. Organizations / Schools
2. Users and Roles
3. Students
4. Teachers
5. Classes
6. Subjects
7. Attendance
8. Results
9. Fees and Invoices
10. Payments
11. Announcements

## Multi-Tenancy Strategy

Every school is represented as an `Organization`. Operational records such as students, teachers, classes and invoices reference `organizationId` so one deployment can support multiple schools.

## Recommended Production Architecture

```txt
Browser / Mobile Web
        |
        v
Next.js App Router
        |
        |-- Server Components
        |-- API Routes / Server Actions
        |-- Auth.js Session Layer
        v
PostgreSQL + Prisma
        |
        |-- School data
        |-- Student data
        |-- Finance records
        |-- Results and attendance
```

## Role-Based Access Plan

- `SUPER_ADMIN`: SaaS owner, can manage all schools
- `SCHOOL_ADMIN`: school management account
- `TEACHER`: class/subject attendance and result entry
- `ACCOUNTANT`: fees, invoices and payments
- `PARENT`: child records, invoices, announcements
- `STUDENT`: personal results, attendance and announcements

## Payment Plan

The repository includes placeholders for Paystack and Stripe. The recommended first production payment integration is Paystack for Nigerian schools.

## Security Priorities

- Add authentication before storing real data
- Enforce organization-level access checks on every query
- Add audit logs for finance and result changes
- Validate all form inputs with Zod
- Store secrets only in environment variables
