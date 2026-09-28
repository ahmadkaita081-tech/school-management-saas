import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  return (
    <main className="public-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero">
        <span className="ui-eyebrow"><MessageCircle size={15} /> Contact</span>
        <h1>Talk to the Horizons team.</h1>
        <p>Use this page for school onboarding, product questions, technical support, partnerships and deployment assistance.</p>
      </section>
      <section className="public-card-grid">
        <article className="ui-card ui-card-pad public-card"><Mail /><h2>General enquiries</h2><p>Email the team for school onboarding, pricing questions and partnerships.</p><a href="mailto:hello@alimswrite.com">hello@alimswrite.com</a></article>
        <article className="ui-card ui-card-pad public-card"><ShieldCheck /><h2>Security contact</h2><p>Report security concerns, account access issues or data protection questions privately.</p><a href="mailto:security@alimswrite.com">security@alimswrite.com</a></article>
        <article className="ui-card ui-card-pad public-card"><MessageCircle /><h2>Support</h2><p>Need deployment or account help? Open the support guide and follow the escalation path.</p><Link href="/support">Open support</Link></article>
      </section>
    </main>
  );
}
