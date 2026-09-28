import { Database, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

const controls = [
  { icon: KeyRound, title: "Role-based access", body: "Owners, principals, teachers, accountants, parents and students each get their own workspace. Every page and every data request checks the caller's permission before answering." },
  { icon: Database, title: "Isolated school workspaces", body: "Each school's records live in its own workspace, enforced at the database layer — a request from one school cannot read or change another school's data." },
  { icon: LockKeyhole, title: "Verified payments", body: "Payment notifications from Paystack are accepted only when their cryptographic signature checks out. Forged callbacks are rejected." },
  { icon: ShieldCheck, title: "Audit trail", body: "Enrolment, results, invoices and payments write events to an audit log, so the school can always answer who changed what." },
];

export default function SecurityPage() {
  return (
    <main className="public-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero"><span className="ui-eyebrow"><ShieldCheck size={15} /> Security</span><h1>Security principles for sensitive school data.</h1><p>Horizons protects student, parent, academic and financial records through layered access, workspace isolation and auditability.</p></section>
      <section className="public-card-grid">{controls.map((control) => { const Icon = control.icon; return <article className="ui-card ui-card-pad public-card" key={control.title}><Icon /><h2>{control.title}</h2><p>{control.body}</p></article>; })}</section>
      <section className="public-panel"><h2>Report a concern</h2><p>Found something that worries you? Write to the security contact and it will be handled privately — never post account or data issues publicly.</p></section>
    </main>
  );
}
