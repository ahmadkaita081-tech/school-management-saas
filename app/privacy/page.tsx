import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

export default function PrivacyPage() {
  return (
    <main className="public-page legal-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero"><span className="ui-eyebrow">Privacy Policy</span><h1>Privacy principles for Horizons.</h1><p>Last updated: May 29, 2026. This policy should be reviewed by legal counsel before use with real customer data.</p></section>
      <section className="legal-content">
        <h2>Information we process</h2><p>Horizons may process school profile data, student records, guardian contact information, attendance records, academic results, invoices, payments, messages and audit events.</p>
        <h2>How information is used</h2><p>Data is used to provide school operations, reporting, communication, portal access, security controls, support and product reliability.</p>
        <h2>Data protection</h2><p>The platform is designed with role-based access, authentication, audit logging and organization-scoped data access. Production deployments must enforce strict RLS policies and server-side permission checks.</p>
        <h2>Data sharing</h2><p>Horizons should not sell school, student or guardian data. Third-party services may be used for hosting, authentication, email, payments and analytics where required to operate the service.</p>
        <h2>Contact</h2><p>For privacy questions, contact <a href="mailto:privacy@alimswrite.com">privacy@alimswrite.com</a>.</p>
      </section>
    </main>
  );
}
