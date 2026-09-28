import Link from "next/link";
import { BookOpenCheck, CheckCircle2, LifeBuoy } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

const supportPaths = [
  { title: "Getting your school live", body: "Follow the setup steps to add your session, classes, staff, students and fees.", href: "/dashboard/setup" },
  { title: "Account and login", body: "Reset a forgotten password or request an email sign-in link from the login page.", href: "/login" },
  { title: "Product documentation", body: "Read the setup, deployment and operations guides in the project docs.", href: "https://github.com/basgenix4u/school-management-saas/tree/main/docs" },
];

export default function SupportPage() {
  return (
    <main className="public-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero">
        <span className="ui-eyebrow"><LifeBuoy size={15} /> Support</span>
        <h1>Support that keeps school operations moving.</h1>
        <p>Horizons support is designed around fast diagnosis, clear ownership and safe handling of school data.</p>
      </section>
      <section className="public-card-grid">
        {supportPaths.map((item) => <article className="ui-card ui-card-pad public-card" key={item.title}><BookOpenCheck /><h2>{item.title}</h2><p>{item.body}</p><Link href={item.href}>Open resource</Link></article>)}
      </section>
      <section className="public-panel"><h2>Support escalation policy</h2><ul>{["Critical authentication or data issues should be treated as urgent.", "Payment and invoice problems should include invoice number, student ID and screenshot where possible.", "Security concerns should never be posted publicly; use the security contact channel."].map((item) => <li key={item}><CheckCircle2 size={17} /> {item}</li>)}</ul></section>
    </main>
  );
}
