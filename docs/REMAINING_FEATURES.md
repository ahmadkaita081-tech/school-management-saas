# Remaining Feature Roadmap

This roadmap lists the remaining features to take Horizons from premium portfolio SaaS to a production-ready commercial school platform.

## Priority 1 — Production Foundation

- Real Supabase Auth integration
- Session-based route protection
- Role-based server-side permission checks
- Organization-scoped data access on every query
- Replace product RLS policies with strict production RLS
- User invitation flow for school owners, principals, teachers, accountants, parents and students
- Password reset and email verification
- Account settings and profile management
- Audit logging for all sensitive mutations

## Priority 2 — Live Database UI Wiring

- Connect Executive Command Center to `/api/live/command-center`
- Connect Student 360 UI to Supabase students endpoints ✅ initial live wiring complete
- Connect Teacher Desk to Supabase attendance endpoints ✅ initial live wiring complete
- Connect Finance Command Center to Supabase invoice endpoints ✅ initial live wiring complete
- Connect Results Command Center to Supabase results endpoints ✅ initial live wiring complete
- Connect Parent Portal to authenticated parent/child records
- Connect Student Portal to authenticated student records
- Add loading, empty and error states for all live modules
- Add optimistic UI updates for CRUD actions

## Priority 3 — Student Management

- Student create/edit forms ✅ setup create flow complete
- Bulk CSV import ✅ initial setup CSV import complete
- Student document uploads
- Guardian linking
- Student transfer between classes
- Student status workflow: active, graduated, suspended, withdrawn
- Student risk scoring based on attendance, fees and results
- Student activity timeline from real audit events
- Advanced student search and filters

## Priority 4 — Teacher and Class Operations

- Teacher create/edit forms
- Assign teachers to classes and subjects
- Teacher timetable view
- Class register persistence
- Attendance submission workflow
- Attendance approval/review workflow
- Late/absence pattern detection
- Teacher comments and class notes
- Teacher workload dashboard

## Priority 5 — Attendance System

- Daily attendance marking by class
- Period-based attendance
- Attendance edit history
- Guardian absence notifications
- Attendance reports by student/class/term
- Attendance heatmaps from live data
- Export attendance CSV/PDF
- Attendance intervention workflow

## Priority 6 — Results and Report Cards

- Live result entry forms ✅ initial API-backed form complete
- Subject score validation
- Grade scale configuration per school
- Result approval workflow
- Principal digital approval
- Report card PDF generation ✅ complete
- Parent/student result publishing
- Result locking after publication ✅ complete
- Class performance analytics
- Position/ranking calculation
- Term/session result archive

## Priority 7 — Fees, Payments and Accounting

- Live invoice creation form
- Bulk invoice generation by class/session
- Paystack payment integration
- Stripe-ready payment abstraction
- Payment verification webhook
- Receipt generation
- Partial payment tracking
- Payment reconciliation dashboard
- Outstanding balance reminders
- Finance export reports
- Scholarship/discount handling
- Expense tracking module

## Priority 8 — Communication System

- Real announcement creation
- Parent message inbox
- Email delivery with Resend
- SMS/WhatsApp provider integration
- Campaign scheduling
- Audience segmentation
- Message templates
- Delivery/read receipts
- Communication history per student/guardian
- Escalation workflows for unread urgent messages

## Priority 9 — Parent and Student Portals

- Parent authentication ✅ supported through Supabase Auth and invitations
- Parent-child linking
- View child attendance
- View child report cards
- View and pay invoices
- Parent messaging with school
- Student authentication ✅ supported through Supabase Auth and invitations
- Student assignments/tasks
- Student progress tracking
- Student announcements
- Mobile-first portal optimization ✅ dashboard navigation improved

## Priority 10 — SaaS Multi-Tenancy

- School onboarding wizard ✅ initial production setup wizard complete
- School settings
- First-run setup APIs ✅ school profile, session, classes, staff, students and fees
- Academic session/term setup
- Class/arm setup
- Subject setup
- Fee category setup
- Subscription/billing plans for schools
- Super admin platform dashboard
- School suspension/reactivation
- Per-school usage analytics

## Priority 11 — AI and Intelligence

- Real risk scoring engine
- Attendance anomaly detection
- Fee collection probability scoring
- Academic performance trend detection
- AI-generated principal summary
- AI-generated parent message drafts
- AI-assisted report card comments
- Intervention recommendation engine
- Smart command center daily briefing

## Priority 12 — Files and Documents

- Student profile photo upload
- Report card PDF storage
- Receipts storage
- School document upload
- Assignment/material upload
- Cloudinary or Supabase Storage integration
- File permission checks

## Priority 13 — Deployment and DevOps

- Vercel deployment
- Supabase environment variables on Vercel
- Production domain
- GitHub Actions build/lint checks
- Preview deployments
- Error monitoring
- Logging
- Backup strategy
- Database migration workflow
- Release tags and changelog

## Priority 14 — Portfolio and Client Presentation

- Screenshots for every major module
- Product video walkthrough
- Live access credentials
- Case study README section
- Architecture diagram
- Product brochure PDF
- Client proposal template
- Pricing page concept
- GitHub pinned project and topics

## Recommended Next Build Order

1. Real Supabase Auth and protected routes
2. Live Student 360 UI connected to Supabase
3. Live attendance marking persistence
4. Live invoice creation and Paystack payment verification
5. Live result entry and report card PDF generation
6. Parent/student authenticated portal data
7. Vercel deployment and access credentials
8. Screenshots/video/case study for GitHub and LinkedIn


## Batch 8 Completed

- Role-based dashboard navigation ✅ complete
- Mobile dashboard navigation redesign ✅ complete
