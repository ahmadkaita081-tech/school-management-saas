"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardCheck, Loader2, RotateCcw, Send, UsersRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { RegisterOutbox, createLocalStore, type RegisterMark } from "@/lib/attendance/outbox";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Metric, MetricGrid } from "@/components/ui/Metric";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";

type MarkStatus = RegisterMark["status"];

type RosterStudent = {
  admissionNo: string;
  name: string;
  classroom: string;
};

type RegisterResponse = {
  status: string;
  date?: string;
  classes?: string[];
  students?: RosterStudent[];
  marks?: Record<string, string>;
  message?: string;
};

type SubmitResponse = {
  status: string;
  saved?: number;
  unknown?: string[];
  message?: string;
};

const STATUSES: Array<{ value: MarkStatus; label: string }> = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

function isStatus(value: unknown): value is MarkStatus {
  return value === "PRESENT" || value === "ABSENT" || value === "LATE" || value === "EXCUSED";
}

async function requestRegister(className: string): Promise<RegisterResponse> {
  const params = className ? `?class=${encodeURIComponent(className)}` : "";
  const response = await fetch(`/api/attendance/register${params}`, { cache: "no-store" });
  const payload = (await response.json()) as RegisterResponse;
  if (!response.ok || payload.status !== "ok") throw new Error(payload.message ?? "Unable to load the register.");
  return payload;
}

async function sendRegister(date: string, period: string, marks: RegisterMark[]): Promise<{ unknown?: string[] }> {
  const response = await fetch("/api/attendance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, period, marks }),
  });
  const payload = (await response.json().catch(() => ({}))) as SubmitResponse;
  if (!response.ok || payload.status !== "saved") {
    throw new Error(payload.message ?? "The register could not be saved.");
  }
  return { unknown: payload.unknown };
}

function RegisterBoard() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [savedMarks, setSavedMarks] = useState<Record<string, MarkStatus>>({});
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({});
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "danger"; text: string } | null>(null);
  const [backlog, setBacklog] = useState(0);

  const outbox = useMemo(
    () => new RegisterOutbox(createLocalStore("Horizons:register-outbox"), (payload) => sendRegister(payload.date, payload.period, payload.marks)),
    [],
  );

  const applyPayload = useCallback((payload: RegisterResponse, className: string) => {
    setClasses(payload.classes ?? []);
    setStudents(payload.students ?? []);
    const saved: Record<string, MarkStatus> = {};
    for (const [admissionNo, status] of Object.entries(payload.marks ?? {})) {
      if (isStatus(status)) saved[admissionNo] = status;
    }
    setSavedMarks(saved);
    setMarks(saved);
    setDate(payload.date ?? "");
    if (!className && (payload.classes ?? []).length > 0) setSelectedClass((current) => current || (payload.classes ?? [])[0]);
  }, []);

  const load = useCallback(async (className: string) => {
    setLoading(true);
    setLoadError(null);
    setNotice(null);
    try {
      applyPayload(await requestRegister(className), className);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The register could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  // Opening load. State starts as loading with no backlog, so the effect only
  // resolves data and sets nothing synchronously.
  useEffect(() => {
    let cancelled = false;
    void requestRegister("").then(
      (payload) => {
        if (cancelled) return;
        applyPayload(payload, "");
        setLoading(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "The register could not be loaded.");
        setLoading(false);
      },
    );
    if (outbox.pending().length > 0) {
      void outbox.flush().then((result) => {
        if (cancelled) return;
        setBacklog(outbox.pending().length);
        if (result.sent > 0) setNotice({ tone: "success", text: `${result.sent} unsent register${result.sent === 1 ? " was" : "s were"} delivered in the background.` });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [applyPayload, outbox]);

  useEffect(() => {
    function onOnline() {
      if (outbox.pending().length === 0) return;
      void outbox.flush().then((result) => {
        setBacklog(outbox.pending().length);
        if (result.sent > 0) {
          setNotice({ tone: "success", text: "Connection restored — unsent registers delivered." });
          void load(selectedClass);
        }
      });
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load, outbox, selectedClass]);

  function selectClass(next: string) {
    setSelectedClass(next);
    void load(next);
  }

  function setStatus(admissionNo: string, status: MarkStatus) {
    setNotice(null);
    setMarks((current) => ({ ...current, [admissionNo]: status }));
  }

  function markAllPresent() {
    setNotice(null);
    setMarks(Object.fromEntries(students.map((student) => [student.admissionNo, "PRESENT" as MarkStatus])));
  }

  const counts = useMemo(() => {
    const list = students.map((student) => marks[student.admissionNo] ?? "PRESENT");
    return {
      total: list.length,
      present: list.filter((status) => status === "PRESENT").length,
      absent: list.filter((status) => status === "ABSENT").length,
      late: list.filter((status) => status === "LATE").length,
      excused: list.filter((status) => status === "EXCUSED").length,
    };
  }, [students, marks]);

  const unsaved = useMemo(
    () => students.filter((student) => (marks[student.admissionNo] ?? "PRESENT") !== (savedMarks[student.admissionNo] ?? "PRESENT")).length,
    [students, marks, savedMarks],
  );

  async function submit() {
    const payload = students.map((student) => ({ admissionNo: student.admissionNo, status: marks[student.admissionNo] ?? "PRESENT" }));
    outbox.enqueue({ date: date || new Date().toISOString().slice(0, 10), period: "Morning", marks: payload });
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await outbox.flush();
      setBacklog(outbox.pending().length);
      if (result.failed.length > 0) {
        setNotice({ tone: "danger", text: `${result.failed[0].error ?? "Submission failed."} The register is kept on this device — try again when the connection improves.` });
        return;
      }
      setSavedMarks(Object.fromEntries(payload.map((mark) => [mark.admissionNo, mark.status])));
      setNotice(
        result.unknown.length > 0
          ? { tone: "warning", text: `Register saved, but ${result.unknown.length} admission number${result.unknown.length === 1 ? " was" : "s were"} not recognised: ${result.unknown.join(", ")}.` }
          : { tone: "success", text: `Register saved — ${counts.present} present, ${counts.absent} absent, ${counts.late} late, ${counts.excused} excused.` },
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card title="Class register" subtitle="Loading the roster…">
        <div className="ui-form">
          <Skeleton height="2.75rem" />
          <Skeleton height="2.75rem" />
          <Skeleton height="2.75rem" />
        </div>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card title="Class register" subtitle="Something went wrong">
        <Alert tone="danger"><p>{loadError}</p></Alert>
        <p><Button variant="secondary" onClick={() => load(selectedClass)}><RotateCcw size={18} /> Try again</Button></p>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card title="Class register" subtitle="No classes exist yet">
        <EmptyState
          icon={<UsersRound size={22} />}
          title="Set up classes first"
          body="Once classes exist and students are enrolled in them, the register for each class will open here."
          action={<Button href="/dashboard/setup">Continue setup</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="ui-form">
      <MetricGrid>
        <Metric icon={<UsersRound size={20} />} label="On roll" value={String(counts.total)} caption={selectedClass || "All classes"} />
        <Metric icon={<CheckCircle2 size={20} />} label="Present" value={String(counts.present)} caption={`${counts.total ? Math.round((counts.present / counts.total) * 100) : 0}% of roll`} />
        <Metric icon={<CalendarCheck size={20} />} label="Absent · Late · Excused" value={`${counts.absent} · ${counts.late} · ${counts.excused}`} caption={formatDate(date)} />
        <Metric icon={<ClipboardCheck size={20} />} label="Unsaved changes" value={String(unsaved)} caption={backlog > 0 ? `${backlog} register${backlog === 1 ? "" : "s"} waiting to send` : "everything saved"} />
      </MetricGrid>

      <div className="ui-toolbar">
        <Field label="Class">
          {(id) => (
            <Select id={id} value={selectedClass} onChange={(event) => selectClass(event.target.value)}>
              {classes.map((name) => <option key={name} value={name}>{name}</option>)}
            </Select>
          )}
        </Field>
        <div className="ui-field">
          <span className="ui-label" aria-hidden="true">Quick actions</span>
          <div><Button variant="secondary" onClick={markAllPresent}><CheckCircle2 size={18} /> Mark all present</Button></div>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}><p>{notice.text}</p></Alert> : null}

      {students.length === 0 ? (
        <Card title={selectedClass} subtitle="No students in this class">
          <EmptyState
            icon={<UsersRound size={22} />}
            title="No students enrolled"
            body="Enrol students into this class and they will appear on the register."
            action={<Button href="/dashboard/students">Open students</Button>}
          />
        </Card>
      ) : (
        <Card title={selectedClass || "Register"} subtitle={`${students.length} students · tap a status per row, then submit once`}>
          <div className="register-list">
            {students.map((student) => {
              const current = marks[student.admissionNo] ?? "PRESENT";
              const edited = current !== (savedMarks[student.admissionNo] ?? "PRESENT");
              return (
                <article key={student.admissionNo} className="register-item">
                  <div className="register-person">
                    <div className="student-avatar mini" aria-hidden="true">
                      {student.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <strong>{student.name}</strong>
                      <span>{student.admissionNo}{edited ? " • edited" : savedMarks[student.admissionNo] ? " • saved" : ""}</span>
                    </div>
                  </div>
                  <div className="ui-segmented" role="group" aria-label={`Attendance for ${student.name}`}>
                    {STATUSES.map((option) => (
                      <button key={option.value} type="button" aria-pressed={current === option.value} onClick={() => setStatus(student.admissionNo, option.value)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="register-actions">
            <Button onClick={submit} disabled={submitting || students.length === 0}>
              {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />} {submitting ? "Saving…" : unsaved > 0 ? `Submit register (${unsaved} change${unsaved === 1 ? "" : "s"})` : "Submit register"}
            </Button>
            {unsaved === 0 && savedMarks && Object.keys(savedMarks).length > 0 ? <Badge tone="success">Saved for today</Badge> : null}
          </div>
        </Card>
      )}
    </div>
  );
}

export function TeacherDailyWorkspace() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="page-eyebrow">Teacher desk</p>
        <h1 className="page-title">Today&apos;s register</h1>
        <p className="page-subtitle">Mark each class once. Unsent registers wait safely on this device until the connection returns.</p>
      </header>
      <RegisterBoard />
    </div>
  );
}

export function AttendanceMarkingWorkspace() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="page-eyebrow">Attendance marking</p>
        <h1 className="page-title">Mark the register</h1>
        <p className="page-subtitle">Present, absent, late or excused — one tap per student, one submit per class.</p>
      </header>
      <RegisterBoard />
    </div>
  );
}
