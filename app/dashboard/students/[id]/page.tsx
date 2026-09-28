import { ArrowLeft, Bell, CreditCard, GraduationCap, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { requestClientOrNull } from "@/lib/supabase/request-client";
import { getStudentProfile } from "@/lib/supabase/school-data";
import { formatDate, formatNairaCompact, formatPhoneForDisplay } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Metric, MetricGrid } from "@/components/ui/Metric";
import { Table } from "@/components/ui/Table";

/**
 * Student 360 profile, assembled from live records.
 *
 * Biodata, computed risk, invoices, recent registers and result averages —
 * each section states plainly when its records do not exist yet.
 */
export const dynamic = "force-dynamic";

function riskTone(risk: string): BadgeTone {
  if (risk === "High") return "danger";
  if (risk === "Medium") return "warning";
  return "success";
}

function attendanceTone(status: string): BadgeTone {
  if (status === "PRESENT") return "success";
  if (status === "ABSENT") return "danger";
  if (status === "LATE") return "warning";
  return "neutral";
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
const id = decodeURIComponent(resolvedParams.id);
  const supabase = await requestClientOrNull();
  if (!supabase) {
    return (
      <div className="page">
        <Alert tone="info"><p>Connect your database to load student profiles.</p></Alert>
      </div>
    );
  }

  const profile = await getStudentProfile(supabase, id).catch(() => null);
  if (!profile) notFound();

  const { student } = profile;
  const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.admission_no;
  const balance = profile.invoices.reduce((sum, row) => sum + Math.max(0, row.amount - row.paid), 0);
  const risk = profile.risk?.level ?? student.risk_level ?? "Low";
  const presentCount = profile.attendance.filter((row) => row.status === "PRESENT").length;

  return (
    <div className="page">
      <header className="page-head flex justify-between items-start">
        <div>
            <p className="page-eyebrow">{student.admission_no} • {profile.student.classroom}</p>
            <h1 className="page-title">{name}</h1>
            <p className="page-subtitle">
                {student.gender ?? "-"} • Guardian: {student.guardian_name ?? "not linked"} 
                {student.guardian_phone ? ` (${formatPhoneForDisplay(student.guardian_phone)})` : ""}
            </p>
        </div>

        {/* Unenroll / Remove Form */}
        <form action="/api/students/delete" method="POST">
            <input type="hidden" name="studentId" value={student.id} />
            <button 
                type="submit" 
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-md transition"
            >
                Unenroll Student
            </button>
        </form>
    </header>
      <p><Badge tone={riskTone(risk)}>{risk} risk</Badge></p>

      <MetricGrid>
        <Metric icon={<GraduationCap size={20} />} label="Academic average" value={profile.results.subjects ? `${profile.results.average}%` : "—"} caption={`${profile.results.subjects} subject records`} />
        <Metric icon={<Bell size={20} />} label="Registers" value={profile.attendance.length ? `${presentCount}/${profile.attendance.length}` : "—"} caption="recent present marks" />
        <Metric icon={<CreditCard size={20} />} label="Fee balance" value={formatNairaCompact(balance)} caption={`${profile.invoices.length} invoices`} />
        <Metric icon={<Phone size={20} />} label="Guardian" value={student.guardian_name ?? "Not linked"} caption={student.guardian_phone ? formatPhoneForDisplay(student.guardian_phone) : "no phone on record"} />
      </MetricGrid>

      <div className="premium-grid-2 align-start">
        <Card title="Invoices" subtitle={profile.invoices.length ? "Newest first." : "No invoices raised for this student."}>
          {profile.invoices.length === 0 ? (
            <EmptyState icon={<CreditCard size={22} />} title="No invoices" body="Raise one from the finance desk when fees are due." />
          ) : (
            <Table>
              <thead><tr><th>Invoice</th><th className="numeric">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {profile.invoices.slice(0, 6).map((row) => (
                  <tr key={row.invoice_no}>
                    <td><a href={`/dashboard/fees/${row.invoice_no}`}>{row.invoice_no}</a><br /><small>{row.title}</small></td>
                    <td className="numeric">{formatNairaCompact(Math.max(0, row.amount - row.paid))}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Recent registers" subtitle={profile.attendance.length ? "Latest 10 marks." : "No registers submitted for this student."}>
          {profile.attendance.length === 0 ? (
            <EmptyState icon={<Bell size={22} />} title="No attendance yet" body="Marks appear once teachers submit registers." />
          ) : (
            <Table>
              <thead><tr><th>Date</th><th>Period</th><th>Status</th></tr></thead>
              <tbody>
                {profile.attendance.slice(0, 10).map((row, index) => (
                  <tr key={`${row.date}-${index}`}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
                    <td>{row.period ?? "—"}</td>
                    <td><Badge tone={attendanceTone(row.status)}>{row.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card title="Risk signals" subtitle="Computed from attendance, fees and results together.">
        {!profile.risk ? (
          <EmptyState icon={<GraduationCap size={22} />} title="Not yet assessed" body="Risk computes once registers, invoices or scores exist." />
        ) : (
          <Table>
            <thead><tr><th>Signal</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Risk score</td><td>{profile.risk.score} / 100</td></tr>
              <tr><td>Attendance rate</td><td>{profile.risk.attendanceRate}% ({profile.risk.absent} absences)</td></tr>
              <tr><td>Outstanding balance</td><td>{formatNairaCompact(profile.risk.balance)} ({profile.risk.overdue} overdue)</td></tr>
              <tr><td>Result average</td><td>{profile.risk.average}%</td></tr>
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
