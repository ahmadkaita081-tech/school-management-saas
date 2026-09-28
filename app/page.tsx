import Link from "next/link";
import { ArrowRight, BellRing, ClipboardCheck, FileSpreadsheet, ReceiptText, ShieldCheck, UsersRound } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: UsersRound,
    title: "Student records",
    body: "Admissions, biodata, guardians and class placement in one record — from admission number to graduation.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance registers",
    body: "Class registers teachers can mark in seconds, with absence patterns visible to principals the same day.",
  },
  {
    icon: FileSpreadsheet,
    title: "Results and report cards",
    body: "Continuous assessment and exam scores flow into reviewed, published report cards — no spreadsheet scramble at term end.",
  },
  {
    icon: ReceiptText,
    title: "Fees and receipts",
    body: "Term invoices, online payment and instant receipts, with the bursar seeing every outstanding balance at a glance.",
  },
  {
    icon: BellRing,
    title: "Parent communication",
    body: "Announcements, fee reminders and result notifications that reach guardians directly — not lost in group chats.",
  },
  {
    icon: ShieldCheck,
    title: "Roles and audit trail",
    body: "Owners, principals, teachers, accountants, parents and students each see only what their role allows. Sensitive actions are logged.",
  },
];

const steps = [
  {
    step: "1",
    title: "Create your school account",
    body: "Sign up as the school owner in minutes. Your school gets its own secure workspace.",
  },
  {
    step: "2",
    title: "Set up the session",
    body: "Add the current session and term, create classes, enrol staff and students, and define term fees.",
  },
  {
    step: "3",
    title: "Run the term",
    body: "Mark registers, raise invoices, enter scores and publish results — with parents following along from their phones.",
  },
];

export default function Landing() {
  return (
    <div className="bg-canvas text-ink-900">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <HorizonsLogo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Primary">
            <a href="#features" className="hover:text-primary-700">Features</a>
            <a href="#how-it-works" className="hover:text-primary-700">How it works</a>
            <Link href="/pricing" className="hover:text-primary-700">Pricing</Link>
            <Link href="/security" className="hover:text-primary-700">Security</Link>
            <Link href="/faq" className="hover:text-primary-700">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button href="/login" variant="ghost" size="sm">Log in</Button>
            <Button href="/login" size="sm">Create school account</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-14 pt-14 text-center md:pt-20">
          <Badge tone="info">Built for Nigerian institutions</Badge>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Run your school from admission to report card.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">
            EduCore replaces paper registers, scattered spreadsheets and lost messages with one
            system for students, attendance, results, fees and parent communication.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/login">
              Create school account <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <Button href="/contact" variant="secondary">Talk to us</Button>
          </div>
          <p className="mt-3 text-sm text-ink-500">Set up your first term in an afternoon.</p>
        </section>

        <section id="features" className="border-y border-border-subtle bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">
              Everything a term demands
            </p>
            <h2 className="mx-auto mt-2 max-w-xl text-center text-3xl font-bold tracking-tight">
              Built for how Nigerian schools actually work.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="ui-card ui-card-pad">
                  <span className="ui-metric-icon" aria-hidden="true"><feature.icon size={20} /></span>
                  <h3 className="ui-card-title">{feature.title}</h3>
                  <p className="ui-card-subtitle">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">How it works</p>
          <h2 className="mx-auto mt-2 max-w-xl text-center text-3xl font-bold tracking-tight">
            From signup to school-day in three steps.
          </h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {steps.map((item) => (
              <li key={item.step} className="ui-card ui-card-pad">
                <span className="ui-badge ui-badge-info" aria-hidden="true">Step {item.step}</span>
                <h3 className="ui-card-title mt-3">{item.title}</h3>
                <p className="ui-card-subtitle">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface-inverse text-ink-inverse">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to run this term properly?</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg opacity-80">
              Create your school account and set up the current session today. Your registers,
              invoices and results will finally live in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/login">Create school account</Button>
              <Button href="/pricing" variant="secondary">See plans</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink-500 md:flex-row">
          <HorizonsLogo />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/pricing" className="hover:text-primary-700">Pricing</Link>
            <Link href="/security" className="hover:text-primary-700">Security</Link>
            <Link href="/support" className="hover:text-primary-700">Support</Link>
            <Link href="/faq" className="hover:text-primary-700">FAQ</Link>
            <Link href="/contact" className="hover:text-primary-700">Contact</Link>
            <Link href="/privacy" className="hover:text-primary-700">Privacy</Link>
            <Link href="/terms" className="hover:text-primary-700">Terms</Link>
          </nav>
          <p>© {new Date().getFullYear()} Horizons. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
