import { CheckCircle2 } from "lucide-react";
import { HorizonsLogo } from "@/components/brand/HorizonsLogo";
import { Button } from "@/components/ui/Button";

const plans = [
  { name: "Launch", fit: "Small schools moving off paper for the first time", features: ["Student records", "Attendance registers", "Term invoices", "Parent portal", "Basic reports"] },
  { name: "Growth", fit: "Schools that want results, reminders and reporting handled", features: ["Everything in Launch", "Results and report cards", "Fee reminders and campaigns", "Audit trail", "Fee intelligence"] },
  { name: "Group", fit: "School groups and institutions with several campuses", features: ["Everything in Growth", "Multi-campus workspaces", "Advanced roles", "Guided onboarding", "Priority support"] },
];

export default function PricingPage() {
  return (
    <main className="public-page">
      <div className="public-nav"><HorizonsLogo /><Button variant="secondary" href="/">Back home</Button></div>
      <section className="public-hero"><span className="ui-eyebrow">Pricing</span><h1>Plans that grow with your school.</h1><p>Pricing depends on enrolment size and the modules you need. Tell us about your school and we will recommend the right plan.</p></section>
      <section className="pricing-grid">{plans.map((plan) => <article className="ui-card ui-card-pad pricing-card" key={plan.name}><h2>{plan.name}</h2><p>{plan.fit}</p><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={16} /> {feature}</li>)}</ul><Button href="/contact">Discuss plan</Button></article>)}</section>
    </main>
  );
}
