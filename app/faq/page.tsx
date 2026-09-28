import { HelpCircle } from "lucide-react";
import { EduCoreLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

const faqs = [
  ["Who is EduCore for?", "Private schools, colleges and school groups in Nigeria — from a single primary school to a multi-campus institution. If you run terms and sessions, admit students by admission number and collect fees per term, the system already speaks your language."],
  ["What does it replace?", "Paper registers, admission spreadsheets, result-computation Excel files, printed invoices tracked by hand, and announcements buried in WhatsApp groups. Each of those becomes a workflow with records you can search and audit."],
  ["How do parents use it?", "From any phone. Guardians see their children's attendance, invoices, receipts, results and announcements through the parent portal — no laptop and no app-store download required."],
  ["How do we receive fee payments?", "Raise term invoices from the system and share them with guardians. Payments are confirmed through Paystack, receipts are issued automatically, and the bursar sees collected versus outstanding at all times."],
  ["Who can see what?", "Access follows roles: owners, principals, teachers, accountants, parents and students each see only their own workspace. A teacher cannot open fee records; a parent only sees their own children."],
  ["What do we need to start?", "One school-owner account, your current session and term, your class list, and your student records with admission numbers. Most schools complete setup in an afternoon."],
  ["Is our data safe?", "Every school's data is isolated to its own workspace, sensitive actions are written to an audit trail, and payment callbacks are verified by signature. Read the full picture on the security page."],
];

export default function FAQPage() {
  return (
    <main className="public-page">
      <div className="public-nav"><EduCoreLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero"><span className="ui-eyebrow"><HelpCircle size={15} /> FAQ</span><h1>Answers for schools evaluating EduCore.</h1><p>What the system does, who it serves, and what getting started takes.</p></section>
      <section className="faq-grid public-faq">{faqs.map(([q, a]) => <article key={q}><h2>{q}</h2><p>{a}</p></article>)}</section>
    </main>
  );
}
