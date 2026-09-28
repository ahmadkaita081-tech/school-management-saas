import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

export default function TermsPage() {
  return (
    <main className="public-page legal-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero"><span className="ui-eyebrow">Terms of Service</span><h1>Terms for using Horizons.</h1><p>Last updated: May 29, 2026. These terms should be reviewed by legal counsel before commercial launch.</p></section>
      <section className="legal-content">
        <h2>Service scope</h2><p>Horizons provides school operations software for administration, academic records, attendance, finance, communication, portals and reporting.</p>
        <h2>Customer responsibilities</h2><p>Schools are responsible for accurate data entry, account access control, lawful processing of student/guardian data and compliance with applicable education and privacy rules.</p>
        <h2>Accounts and access</h2><p>Users must protect credentials and only access information they are authorized to use. Administrators are responsible for assigning correct roles.</p>
        <h2>Payments</h2><p>Payment features must be configured with approved payment providers. Schools remain responsible for validating financial records and reconciliation.</p>
        <h2>Limitations</h2><p>The platform should be tested and configured before production use. No software can guarantee uninterrupted service, but production deployments should include monitoring, backups and incident response.</p>
        <h2>Contact</h2><p>For terms questions, contact <a href="mailto:legal@alimswrite.com">legal@alimswrite.com</a>.</p>
      </section>
    </main>
  );
}
