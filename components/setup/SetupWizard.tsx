"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, CalendarDays, GraduationCap, Loader2, Receipt, Rocket, School, UsersRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const steps = [
  { id: "school", label: "School profile", icon: Building2 },
  { id: "session", label: "Academic session", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: School },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "students", label: "Students", icon: GraduationCap },
  { id: "fees", label: "Fees", icon: Receipt },
  { id: "launch", label: "Launch", icon: Rocket },
];

type Readiness = {
  organization_name?: string;
  readiness_score?: number;
  students_count?: number;
  teachers_count?: number;
  classes_count?: number;
  fee_categories_count?: number;
  academic_sessions_count?: number;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

const MAX_CSV_BYTES = 2 * 1024 * 1024;

async function fileText(form: FormData, key: string) {
  const file = form.get(key);
  if (!(file instanceof File) || file.size === 0) return "";
  if (file.size > MAX_CSV_BYTES) {
    throw new Error("That CSV is larger than 2 MB. Split it into smaller files and import each in turn.");
  }
  return file.text();
}

function classesFromRows(rows: string[][]) {
  return rows.map(([name, level, arm, capacity]) => ({ name, level, arm, capacity: Number(capacity || 0) || undefined })).filter((item) => item.name);
}

function teachersFromRows(rows: string[][]) {
  return rows.map(([staffNo, name, email, phone, department, title]) => ({ staffNo, name, email, phone, department, title })).filter((item) => item.staffNo && item.name);
}

function studentsFromRows(rows: string[][]) {
  return rows.map(([admissionNo, firstName, lastName, className, gender, guardianName, guardianPhone, guardianEmail, studentEmail]) => ({ admissionNo, firstName, lastName, className, gender, guardianName, guardianPhone, guardianEmail, studentEmail })).filter((item) => item.admissionNo && item.firstName && item.lastName);
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? "Unable to save");
  return payload;
}

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Start by creating your school profile.");
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  async function loadReadiness() {
    try {
      const response = await fetch("/api/setup/status", { cache: "no-store" });
      const payload = await response.json();
      setReadiness(payload.readiness ?? null);
    } catch {
      setReadiness(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReadiness(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      if (step === 0) {
        await postJson("/api/setup/organization", { name: form.get("name"), slug: form.get("slug"), email: form.get("email"), phone: form.get("phone"), address: form.get("address") });
        setMessage("School profile saved.");
      }
      if (step === 1) {
        await postJson("/api/setup/session", { name: form.get("name"), currentTerm: form.get("currentTerm"), startsOn: form.get("startsOn"), endsOn: form.get("endsOn") });
        setMessage("Academic session saved.");
      }
      if (step === 2) {
        const rows = [...parseCsv(String(form.get("bulkClasses") || "")), ...parseCsv(await fileText(form, "classesFile"))];
        const classes = rows.length ? classesFromRows(rows) : [{ name: String(form.get("name") || ""), level: String(form.get("level") || ""), arm: String(form.get("arm") || ""), capacity: Number(form.get("capacity") || 0) || undefined }].filter((item) => item.name);
        await postJson("/api/setup/classes", { classes });
        setMessage(`${classes.length} class record(s) saved.`);
      }
      if (step === 3) {
        const rows = [...parseCsv(String(form.get("bulkTeachers") || "")), ...parseCsv(await fileText(form, "teachersFile"))];
        const teachers = rows.length ? teachersFromRows(rows) : [{ staffNo: String(form.get("staffNo") || ""), name: String(form.get("name") || ""), email: String(form.get("email") || ""), phone: String(form.get("phone") || ""), department: String(form.get("department") || ""), title: String(form.get("title") || "") }].filter((item) => item.staffNo && item.name);
        await postJson("/api/setup/teachers", { teachers });
        setMessage(`${teachers.length} staff record(s) saved.`);
      }
      if (step === 4) {
        const rows = [...parseCsv(String(form.get("bulkStudents") || "")), ...parseCsv(await fileText(form, "studentsFile"))];
        const students = rows.length ? studentsFromRows(rows) : [{ firstName: String(form.get("firstName") || ""), lastName: String(form.get("lastName") || ""), admissionNo: String(form.get("admissionNo") || ""), className: String(form.get("className") || ""), gender: String(form.get("gender") || ""), guardianName: String(form.get("guardianName") || ""), guardianPhone: String(form.get("guardianPhone") || ""), guardianEmail: String(form.get("guardianEmail") || ""), studentEmail: String(form.get("studentEmail") || "") }].filter((item) => item.firstName && item.lastName && item.admissionNo);
        await postJson("/api/setup/students", { students });
        setMessage(`${students.length} student record(s) saved.`);
      }
      if (step === 5) {
        await postJson("/api/setup/fees", { fees: [{ name: form.get("name"), amount: Number(form.get("amount") || 0), billingCycle: form.get("billingCycle"), required: form.get("required") === "on" }] });
        setMessage("Fee category saved.");
      }
      if (event.currentTarget) {
    event.currentTarget.reset();
}
      await loadReadiness();
      setStep((current) => Math.min(current + 1, steps.length - 1));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save setup step.");
    } finally {
      setSaving(false);
    }
  }

  const score = readiness?.readiness_score ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-eyebrow">Setup · {score}% ready</p>
        <h1 className="page-title">Set up your school.</h1>
        <p className="page-subtitle">Profile, session, classes, staff, students and fees — only your real school data.</p>
      </header>

      <ol className="ui-steps" aria-label="Setup progress">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const state = index === step ? "current" : index < step ? "done" : "todo";
          return (
            <li key={item.id} data-state={state}>
              <button type="button" onClick={() => setStep(index)} aria-current={state === "current" ? "step" : undefined}>
                <Icon size={17} aria-hidden="true" /><span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <Alert tone={saving ? "info" : "success"}><p>{message}</p></Alert>

      <div className="premium-grid-2 align-start">
        <Card title={step < 6 ? steps[step].label : "Setup review"} subtitle={readiness?.organization_name ?? "No school profile yet"}>
          {step < 6 ? (
            <form className="ui-form" onSubmit={handleSubmit}>
              {step === 0 ? <SchoolProfileFields /> : null}
              {step === 1 ? <SessionFields /> : null}
              {step === 2 ? <ClassFields /> : null}
              {step === 3 ? <StaffFields /> : null}
              {step === 4 ? <StudentFields /> : null}
              {step === 5 ? <FeeFields /> : null}
              <div>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />} Save and continue
                </Button>
              </div>
            </form>
          ) : (
            <div className="ui-form">
              <p>Your readiness score is {score}%. Continue adding real records until every core module is ready.</p>
              <div className="action-row">
                <Button href="/dashboard">Open overview</Button>
                <Button variant="secondary" href="/dashboard/students">Manage students</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="What is ready?" subtitle="Counts update after every saved step.">
          <div className="trust-list">
            <ReadinessItem label="School profile" value={readiness?.organization_name ? "Ready" : "Pending"} />
            <ReadinessItem label="Academic sessions" value={String(readiness?.academic_sessions_count ?? 0)} />
            <ReadinessItem label="Classes" value={String(readiness?.classes_count ?? 0)} />
            <ReadinessItem label="Staff" value={String(readiness?.teachers_count ?? 0)} />
            <ReadinessItem label="Students" value={String(readiness?.students_count ?? 0)} />
            <ReadinessItem label="Fee categories" value={String(readiness?.fee_categories_count ?? 0)} />
          </div>
          <p className="ui-hint">When setup is complete, your modules show real school records instead of empty states.</p>
        </Card>
      </div>
    </div>
  );
}

function TextField({ name, label, placeholder, type = "text", required = false }: { name: string; label: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <Field label={label} required={required}>
      {(id) => <Input id={id} name={name} type={type} placeholder={placeholder} required={required} autoComplete="off" />}
    </Field>
  );
}

function CsvField({ name, label, hint, placeholder }: { name: string; label: string; hint: string; placeholder: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => <Textarea id={id} name={name} rows={3} placeholder={placeholder} />}
    </Field>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  return (
    <Field label={label}>
      {(id) => <Input id={id} name={name} type="file" />}
    </Field>
  );
}

function SchoolProfileFields() {
  return (
    <>
      <TextField name="name" label="School name" required placeholder="Example International School" />
      <TextField name="slug" label="Workspace slug" placeholder="example-school" />
      <TextField name="email" label="School email" type="email" />
      <TextField name="phone" label="Phone" />
      <Field label="Address">{(id) => <Textarea id={id} name="address" rows={2} placeholder="School address" />}</Field>
    </>
  );
}

function SessionFields() {
  return (
    <>
      <TextField name="name" label="Session" required placeholder="2026/2027" />
      <TextField name="currentTerm" label="Current term" required placeholder="First Term" />
      <TextField name="startsOn" label="Start date" type="date" />
      <TextField name="endsOn" label="End date" type="date" />
    </>
  );
}

function ClassFields() {
  return (
    <>
      <TextField name="name" label="Class name" placeholder="SS2 Science" />
      <TextField name="level" label="Level" placeholder="Senior Secondary" />
      <TextField name="arm" label="Arm" placeholder="Science" />
      <TextField name="capacity" label="Capacity" type="number" />
      <CsvField name="bulkClasses" label="Paste class CSV rows" hint="One per line: class name, level, arm, capacity." placeholder={"SS2 Science,Senior Secondary,Science,45\nJSS3 Gold,Junior Secondary,Gold,40"} />
      <FileField name="classesFile" label="Upload class CSV" />
    </>
  );
}

function StaffFields() {
  return (
    <>
      <TextField name="staffNo" label="Staff number" placeholder="TCH-001" />
      <TextField name="name" label="Full name" />
      <TextField name="email" label="Email" type="email" />
      <TextField name="phone" label="Phone" />
      <TextField name="department" label="Department" />
      <TextField name="title" label="Title" placeholder="Mathematics Teacher" />
      <CsvField name="bulkTeachers" label="Paste staff CSV rows" hint="One per line: staff no, name, email, phone, department, title." placeholder="TCH-001,Amina Musa,amina@example.com,+234...,Science,Physics Teacher" />
      <FileField name="teachersFile" label="Upload staff CSV" />
    </>
  );
}

function StudentFields() {
  return (
    <>
      <TextField name="firstName" label="First name" />
      <TextField name="lastName" label="Last name" />
      <TextField name="admissionNo" label="Admission no." placeholder="STU-001" />
      <TextField name="className" label="Class" placeholder="SS2 Science" />
      <TextField name="gender" label="Gender" />
      <TextField name="guardianName" label="Guardian name" />
      <TextField name="guardianPhone" label="Guardian phone" />
      <TextField name="guardianEmail" label="Guardian email" type="email" />
      <TextField name="studentEmail" label="Student login email" type="email" />
      <CsvField name="bulkStudents" label="Paste student CSV rows" hint="One per line: admission no, first name, last name, class, gender, guardian name, guardian phone, guardian email, student email." placeholder="STU-001,Amina,Yusuf,SS2 Science,Female,Mr Yusuf,+234...,parent@example.com,student@example.com" />
      <FileField name="studentsFile" label="Upload student CSV" />
    </>
  );
}

function FeeFields() {
  return (
    <>
      <TextField name="name" label="Fee name" required placeholder="Tuition" />
      <TextField name="amount" label="Amount (₦)" type="number" required />
      <TextField name="billingCycle" label="Billing cycle" placeholder="termly" />
      <div>
        <label className="ui-checkbox">
          <input name="required" type="checkbox" defaultChecked /> Required fee
        </label>
      </div>
    </>
  );
}

function ReadinessItem({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <div><strong>{label}</strong></div>
      <span>{value}</span>
    </article>
  );
}
