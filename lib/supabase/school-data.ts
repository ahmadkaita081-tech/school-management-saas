import { createServerSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { normaliseNigerianPhone } from "@/lib/format";
import type { AttendanceDay, ClassAttendance, FinanceSummary, InsightContext, ResultTerm, RiskRow } from "@/lib/insights/engine";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

type OrganizationRow = { id: string; name: string; slug: string };
type ClassroomRow = { id: string; name: string; organization_id: string };
type StudentRow = {
  id: string;
  organization_id: string;
  classroom_id: string | null;
  admission_no: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  student_email: string | null;
  risk_level: string;
  status: string;
  active: boolean;
};

type StudentViewRow = {
  id: string;
  admission_no: string;
  student_name: string;
  classroom: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  risk_level: string | null;
  attendance_records: number | null;
  invoices: number | null;
  balance: string | number | null;
};

type InvoiceRow = {
  id: string;
  invoice_no: string;
  title: string;
  amount: string | number;
  amount_paid: string | number;
  status: string;
  due_date: string | null;
  payment_probability: number;
  student_id: string;
  organization_id: string;
};

type SubjectRow = { id: string; name: string; organization_id: string; classroom_id: string | null };

type ResultRow = {
  id: string;
  organization_id: string;
  student_id: string;
  subject_id: string;
  term: string;
  session: string;
  ca_score: string | number;
  exam_score: string | number;
  total_score: string | number;
  grade: string | null;
  remark: string | null;
  status: string;
  teacher_comment: string | null;
  principal_comment: string | null;
};

export type StudentCreateInput = {
  firstName: string;
  lastName: string;
  admissionNo: string;
  className?: string;
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  studentEmail?: string;
  riskLevel?: string;
};

export type AttendanceCreateInput = {
  admissionNo: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  period?: string;
  date?: string;
  note?: string;
};

export type InvoiceCreateInput = {
  admissionNo: string;
  invoiceNo: string;
  title?: string;
  amount: number;
  amountPaid?: number;
  status?: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  dueDate?: string;
  paymentProbability?: number;
};

export type ResultUpsertInput = {
  admissionNo: string;
  subjectName: string;
  term: string;
  session: string;
  caScore: number;
  examScore: number;
  grade?: string;
  remark?: string;
  status?: "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED";
  teacherComment?: string;
  principalComment?: string;
};

export function configuredOrNull() {
  if (!hasSupabaseConfig()) return null;
  return createServerSupabaseClient();
}

export async function getClassroomByName(client: SupabaseClient, organizationId: string, className?: string) {
  if (!className) return null;
  const { data, error } = await client
    .from("classrooms")
    .select("id,name,organization_id")
    .eq("organization_id", organizationId)
    .eq("name", className)
    .maybeSingle<ClassroomRow>();
  if (error) throw error;
  return data;
}

export async function getStudentByAdmission(client: SupabaseClient, organizationId: string, admissionNo: string) {
  const { data, error } = await client
    .from("students")
    .select("id,organization_id,classroom_id,admission_no,first_name,last_name,gender,guardian_name,guardian_phone,guardian_email,student_email,risk_level,status,active")
    .eq("organization_id", organizationId)
    .eq("admission_no", admissionNo)
    .maybeSingle<StudentRow>();
  if (error) throw error;
  return data;
}

export type PageInput = { limit?: number; offset?: number };
export type PageInfo = { total: number; limit: number; offset: number; hasMore: boolean };

/** Clamped pagination: 200 rows default, 500 hard cap, never negative. */
export function pageParams(input?: PageInput) {
  const limit = Math.max(1, Math.min(Math.floor(input?.limit ?? 200), 500));
  const offset = Math.max(0, Math.floor(input?.offset ?? 0));
  return { limit, offset };
}

export async function listLiveStudents(client: SupabaseClient, page?: PageInput) {
  const { limit, offset } = pageParams(page);
  const [rows, highRisk, withBalance] = await Promise.all([
    client
      .from("v_student_360")
      .select("id,admission_no,student_name,classroom,guardian_name,guardian_phone,risk_level,attendance_records,invoices,balance", { count: "exact" })
      .order("student_name", { ascending: true })
      .range(offset, offset + limit - 1)
      .returns<StudentViewRow[]>(),
    client.from("v_student_360").select("id", { count: "exact", head: true }).eq("risk_level", "High"),
    client.from("v_student_360").select("id", { count: "exact", head: true }).gt("balance", 0),
  ]);
  if (rows.error) throw rows.error;
  if (highRisk.error) throw highRisk.error;
  if (withBalance.error) throw withBalance.error;
  const students = rows.data ?? [];
  const total = rows.count ?? students.length;
  return {
    summary: {
      total,
      highRisk: highRisk.count ?? 0,
      withBalance: withBalance.count ?? 0,
    },
    data: students,
    page: { total, limit, offset, hasMore: offset + students.length < total } as PageInfo,
  };
}

export async function createLiveStudent(client: SupabaseClient, input: StudentCreateInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const classroom = await getClassroomByName(client, organization.id, input.className);
  const payload = {
    organization_id: organization.id,
    classroom_id: classroom?.id ?? null,
    admission_no: input.admissionNo,
    first_name: input.firstName,
    last_name: input.lastName,
    gender: input.gender ?? null,
    guardian_name: input.guardianName ?? null,
    guardian_phone: canonicalPhone(input.guardianPhone),
    guardian_email: cleanEmail(input.guardianEmail),
    student_email: cleanEmail(input.studentEmail),
    risk_level: input.riskLevel ?? "Low",
  };
  const { data, error } = await client.from("students").upsert(payload, { onConflict: "organization_id,admission_no" }).select("*").single<StudentRow>();
  if (error) throw error;
  await linkExistingUsersForStudent(client, data).catch(() => []);
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "student.upsert", resourceType: "student", resourceId: data.id, riskLevel: "Medium", metadata: { admissionNo: data.admission_no } });
  return data;
}

export async function updateLiveStudent(client: SupabaseClient, admissionNo: string, changes: Partial<StudentCreateInput>, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const classroom = await getClassroomByName(client, organization.id, changes.className);
  const payload: Record<string, string | null> = {};
  if (changes.firstName) payload.first_name = changes.firstName;
  if (changes.lastName) payload.last_name = changes.lastName;
  if (changes.gender !== undefined) payload.gender = changes.gender ?? null;
  if (changes.guardianName !== undefined) payload.guardian_name = changes.guardianName ?? null;
  if (changes.guardianPhone !== undefined) payload.guardian_phone = canonicalPhone(changes.guardianPhone);
  if (changes.guardianEmail !== undefined) payload.guardian_email = changes.guardianEmail ?? null;
  if (changes.studentEmail !== undefined) payload.student_email = changes.studentEmail ?? null;
  if (changes.riskLevel !== undefined) payload.risk_level = changes.riskLevel ?? "Low";
  if (classroom) payload.classroom_id = classroom.id;

  const { data, error } = await client
    .from("students")
    .update(payload)
    .eq("organization_id", organization.id)
    .eq("admission_no", admissionNo)
    .select("*")
    .single<StudentRow>();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "student.update", resourceType: "student", resourceId: data.id, riskLevel: "Medium", metadata: { admissionNo: data.admission_no } });
  return data;
}

export async function listLiveAttendance(client: SupabaseClient) {
  const { data, error } = await client
    .from("attendance_records")
    .select("id,attendance_date,period,status,note,students(admission_no,first_name,last_name),classrooms(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createLiveAttendance(client: SupabaseClient, input: AttendanceCreateInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const student = await getStudentByAdmission(client, organization.id, input.admissionNo);
  if (!student) throw new Error(`Student ${input.admissionNo} not found`);
  const payload = {
    organization_id: organization.id,
    student_id: student.id,
    classroom_id: student.classroom_id,
    attendance_date: input.date ?? new Date().toISOString().slice(0, 10),
    period: input.period ?? "Morning",
    status: input.status,
    note: input.note ?? null,
  };
  const { data, error } = await client.from("attendance_records").upsert(payload, { onConflict: "student_id,attendance_date,period" }).select("*").single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "attendance.upsert", resourceType: "attendance", resourceId: data.id, metadata: { status: data.status } });
  return data;
}

export async function listLiveInvoices(client: SupabaseClient, page?: PageInput) {
  const { limit, offset } = pageParams(page);
  const { data, error, count } = await client
    .from("invoices")
    .select("id,organization_id,invoice_no,title,amount,amount_paid,status,due_date,payment_probability,student_id,students(admission_no,first_name,last_name,guardian_name,guardian_email,student_email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<Array<InvoiceRow & { students: Record<string, unknown> | null }>>();
  if (error) throw error;
  const rows = data ?? [];
  const total = count ?? rows.length;
  return { data: rows, page: { total, limit, offset, hasMore: offset + rows.length < total } as PageInfo };
}

export async function getLiveInvoice(client: SupabaseClient, invoiceNo: string) {
  const { data, error } = await client
    .from("invoices")
    .select("id,organization_id,invoice_no,title,amount,amount_paid,status,due_date,payment_probability,student_id,students(admission_no,first_name,last_name,guardian_name,guardian_email,student_email)")
    .eq("invoice_no", invoiceNo)
    .maybeSingle<InvoiceRow & { students: Record<string, unknown> | null }>();
  if (error) throw error;
  return data;
}

/**
 * Exact invoice lookup by id.
 *
 * Numbers repeat across schools, so payment callbacks resolve the id stored
 * in Paystack metadata rather than trusting the number alone.
 */
export async function getLiveInvoiceById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("invoices")
    .select("id,organization_id,invoice_no,title,amount,amount_paid,status,due_date,payment_probability,student_id,students(admission_no,first_name,last_name,guardian_name,guardian_email,student_email)")
    .eq("id", id)
    .maybeSingle<InvoiceRow & { students: Record<string, unknown> | null }>();
  if (error) throw error;
  return data;
}

export async function createLiveInvoice(client: SupabaseClient, input: InvoiceCreateInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const student = await getStudentByAdmission(client, organization.id, input.admissionNo);
  if (!student) throw new Error(`Student ${input.admissionNo} not found`);
  const payload = {
    organization_id: organization.id,
    student_id: student.id,
    invoice_no: input.invoiceNo.trim().toUpperCase(),
    title: input.title ?? "School Fees",
    amount: input.amount,
    amount_paid: input.amountPaid ?? 0,
    status: input.status ?? "PENDING",
    due_date: input.dueDate ?? null,
    payment_probability: input.paymentProbability ?? 50,
  };
  const { data, error } = await client.from("invoices").insert(payload).select("*").single<InvoiceRow>();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "invoice.create", resourceType: "invoice", resourceId: data.id, riskLevel: "Medium", metadata: { invoiceNo: data.invoice_no, amount: data.amount } });
  return data;
}

export async function getOrCreateSubject(client: SupabaseClient, organizationId: string, subjectName: string) {
  const { data: existing, error: findError } = await client
    .from("subjects")
    .select("id,name,organization_id,classroom_id")
    .eq("organization_id", organizationId)
    .eq("name", subjectName)
    .maybeSingle<SubjectRow>();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await client
    .from("subjects")
    .insert({ organization_id: organizationId, name: subjectName })
    .select("id,name,organization_id,classroom_id")
    .single<SubjectRow>();
  if (error) throw error;
  return data;
}

export async function listLiveResults(client: SupabaseClient, page?: PageInput) {
  const { limit, offset } = pageParams(page);
  const { data, error, count } = await client
    .from("results")
    .select("id,student_id,subject_id,term,session,ca_score,exam_score,total_score,grade,remark,status,teacher_comment,principal_comment,students(admission_no,first_name,last_name),subjects(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<Array<ResultRow & { students: Record<string, unknown> | null; subjects: Record<string, unknown> | null }>>();
  if (error) throw error;
  const rows = data ?? [];
  const total = count ?? rows.length;
  return { data: rows, page: { total, limit, offset, hasMore: offset + rows.length < total } as PageInfo };
}

export async function getLiveResultByStudent(client: SupabaseClient, admissionNo: string) {
  const organization = await getOrganizationForWrite(client);
  const student = await getStudentByAdmission(client, organization.id, admissionNo);
  if (!student) return null;
  const { data, error } = await client
    .from("results")
    .select("id,student_id,subject_id,term,session,ca_score,exam_score,total_score,grade,remark,status,teacher_comment,principal_comment,subjects(name)")
    .eq("student_id", student.id)
    .returns<Array<ResultRow & { subjects: Record<string, unknown> | null }>>();
  if (error) throw error;
  return { student, results: data ?? [] };
}

export async function upsertLiveResult(client: SupabaseClient, input: ResultUpsertInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const student = await getStudentByAdmission(client, organization.id, input.admissionNo);
  if (!student) throw new Error(`Student ${input.admissionNo} not found`);
  const subject = await getOrCreateSubject(client, organization.id, input.subjectName);
  const total = input.caScore + input.examScore;
  const payload = {
    organization_id: organization.id,
    student_id: student.id,
    subject_id: subject.id,
    term: input.term,
    session: input.session,
    ca_score: input.caScore,
    exam_score: input.examScore,
    grade: input.grade ?? calculateGrade(total),
    remark: input.remark ?? calculateRemark(total),
    status: input.status ?? "DRAFT",
    teacher_comment: input.teacherComment ?? null,
    principal_comment: input.principalComment ?? null,
  };
  const { data, error } = await client
    .from("results")
    .upsert(payload, { onConflict: "student_id,subject_id,term,session" })
    .select("*")
    .single<ResultRow>();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "result.upsert", resourceType: "result", resourceId: data.id, riskLevel: "Medium", metadata: { term: data.term, session: data.session, total: data.total_score } });
  return data;
}

function calculateGrade(score: number) {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function calculateRemark(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Improvement";
}

export type OrganizationSetupInput = {
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type AcademicSessionInput = {
  name: string;
  currentTerm: string;
  startsOn?: string;
  endsOn?: string;
};

export type ClassroomSetupInput = {
  name: string;
  level?: string;
  arm?: string;
  capacity?: number;
};

export type TeacherSetupInput = {
  staffNo: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  title?: string;
};

export type FeeCategoryInput = {
  name: string;
  amount: number;
  billingCycle?: string;
  required?: boolean;
};


function relationName(value: unknown) {
  if (!value) return null;
  if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.name ?? "") || null;
  if (typeof value === "object") return String((value as Record<string, unknown>).name ?? "") || null;
  return null;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "school";
}

/**
 * Resolves the school this request belongs to.
 *
 * With a request-scoped client, row level security limits `organizations` to
 * the caller's membership, so this returns their school and nothing else. The
 * ordering is retained only to make the result deterministic.
 *
 * Passing a service role client here would return the oldest school on the
 * platform regardless of the caller, so that client must never reach this path.
 */
export async function getPrimaryOrganization(client: SupabaseClient) {
  const { data, error } = await client.from("organizations").select("id,name,slug").order("created_at", { ascending: true }).limit(1).maybeSingle<OrganizationRow>();
  if (error) throw error;
  return data;
}

/** Resolves the school for a write, preferring an explicit id from the session. */
export async function getOrganizationForWrite(client: SupabaseClient, organizationId?: string) {
  if (organizationId) {
    const { data, error } = await client.from("organizations").select("id,name,slug").eq("id", organizationId).maybeSingle<OrganizationRow>();
    if (error) throw error;
    if (data) return data;
    throw new Error("School workspace not found for this account.");
  }

  const primary = await getPrimaryOrganization(client);
  if (primary) return primary;
  throw new Error("Create a school profile before adding records.");
}

export async function upsertOrganization(client: SupabaseClient, input: OrganizationSetupInput, actor?: ActorInput) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const { data, error } = await client.from("organizations").upsert({
    name: input.name,
    slug,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    active: true,
  }, { onConflict: "slug" }).select("id,name,slug").single<OrganizationRow>();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.id, ...actorFields(actor), action: "organization.upsert", resourceType: "organization", resourceId: data.id, riskLevel: "Medium", metadata: { slug: data.slug } });
  return data;
}

export async function upsertAcademicSession(client: SupabaseClient, organizationId: string, input: AcademicSessionInput, actor?: ActorInput) {
  const { data, error } = await client.from("academic_sessions").upsert({
    organization_id: organizationId,
    name: input.name,
    current_term: input.currentTerm,
    starts_on: input.startsOn || null,
    ends_on: input.endsOn || null,
    active: true,
  }, { onConflict: "organization_id,name" }).select("*").single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId, ...actorFields(actor), action: "academic_session.upsert", resourceType: "academic_session", resourceId: data.id, metadata: { name: input.name, currentTerm: input.currentTerm } });
  return data;
}

export async function upsertClassrooms(client: SupabaseClient, organizationId: string, classes: ClassroomSetupInput[], actor?: ActorInput) {
  const rows = classes.filter((item) => item.name).map((item) => ({
    organization_id: organizationId,
    name: item.name,
    level: item.level ?? null,
    arm: item.arm ?? null,
    capacity: item.capacity ?? null,
  }));
  if (!rows.length) return [];
  const { data, error } = await client.from("classrooms").upsert(rows, { onConflict: "organization_id,name" }).select("*");
  if (error) throw error;
  await writeAuditEvent(client, { organizationId, ...actorFields(actor), action: "classrooms.upsert_bulk", resourceType: "classrooms", riskLevel: "Medium", metadata: { count: rows.length } });
  return data ?? [];
}

export async function upsertTeachers(client: SupabaseClient, organizationId: string, teachers: TeacherSetupInput[], actor?: ActorInput) {
  const rows = teachers.filter((item) => item.staffNo && item.name).map((item) => ({
    organization_id: organizationId,
    staff_no: item.staffNo,
    name: item.name,
    email: item.email ?? null,
    phone: item.phone ?? null,
    department: item.department ?? null,
    title: item.title ?? null,
    active: true,
  }));
  if (!rows.length) return [];
  const { data, error } = await client.from("teachers").upsert(rows, { onConflict: "organization_id,staff_no" }).select("*");
  if (error) throw error;
  await writeAuditEvent(client, { organizationId, ...actorFields(actor), action: "teachers.upsert_bulk", resourceType: "teachers", riskLevel: "Medium", metadata: { count: rows.length } });
  return data ?? [];
}

export async function upsertFeeCategories(client: SupabaseClient, organizationId: string, fees: FeeCategoryInput[], actor?: ActorInput) {
  const rows = fees.filter((item) => item.name).map((item) => ({
    organization_id: organizationId,
    name: item.name,
    amount: item.amount,
    billing_cycle: item.billingCycle ?? "termly",
    required: item.required ?? true,
    active: true,
  }));
  if (!rows.length) return [];
  const { data, error } = await client.from("fee_categories").upsert(rows, { onConflict: "organization_id,name" }).select("*");
  if (error) throw error;
  await writeAuditEvent(client, { organizationId, ...actorFields(actor), action: "fee_categories.upsert_bulk", resourceType: "fee_categories", riskLevel: "Medium", metadata: { count: rows.length } });
  return data ?? [];
}

export async function getSetupReadiness(client: SupabaseClient) {
  const { data, error } = await client.from("v_setup_readiness").select("*").order("readiness_score", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export type InvitationInput = {
  email: string;
  name?: string;
  role: "SCHOOL_OWNER" | "PRINCIPAL" | "TEACHER" | "ACCOUNTANT" | "PARENT" | "STUDENT" | "SUPER_ADMIN";
};

export async function getAccessSummary(client: SupabaseClient) {
  const { data, error } = await client.from("v_user_access_summary").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listInvitations(client: SupabaseClient, page?: PageInput) {
  const organization = await getOrganizationForWrite(client);
  const { limit, offset } = pageParams(page);
  const { data, error, count } = await client
    .from("user_invitations")
    .select("id,organization_id,email,name,role,status,token,expires_at,created_at", { count: "exact" })
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const rows = data ?? [];
  const total = count ?? rows.length;
  return { data: rows, page: { total, limit, offset, hasMore: offset + rows.length < total } as PageInfo };
}

export async function createInvitation(client: SupabaseClient, input: InvitationInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const { data, error } = await client
    .from("user_invitations")
    .upsert({
      organization_id: organization.id,
      email: input.email.toLowerCase().trim(),
      name: input.name ?? null,
      role: input.role,
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "organization_id,email" })
    .select("id,organization_id,email,name,role,status,token,expires_at,created_at")
    .single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "invitation.create", resourceType: "invitation", resourceId: data.id, riskLevel: "Medium", metadata: { email: data.email, role: data.role } });
  return data;
}

export async function acceptInvitation(client: SupabaseClient, token: string, authUserId: string, email: string) {
  const { data: invitation, error: inviteError } = await client
    .from("user_invitations")
    .select("id,organization_id,email,name,role,status,expires_at")
    .eq("token", token)
    .maybeSingle<{ id: string; organization_id: string; email: string; name: string | null; role: string; status: string; expires_at: string }>();
  if (inviteError) throw inviteError;
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "pending") throw new Error("Invitation is no longer pending");
  if (new Date(invitation.expires_at).getTime() < Date.now()) throw new Error("Invitation has expired");
  if (invitation.email.toLowerCase() !== email.toLowerCase()) throw new Error("Invitation email does not match authenticated user");

  const { data: profile, error: profileError } = await client
    .from("app_users")
    .upsert({
      organization_id: invitation.organization_id,
      auth_user_id: authUserId,
      email: invitation.email.toLowerCase(),
      name: invitation.name ?? email,
      role: invitation.role,
      active: true,
    }, { onConflict: "email" })
    .select("*")
    .single();
  if (profileError) throw profileError;

  const { error: updateError } = await client
    .from("user_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);
  if (updateError) throw updateError;
  await writeAuditEvent(client, { organizationId: invitation.organization_id, action: "invitation.accept", resourceType: "invitation", resourceId: invitation.id, riskLevel: "Medium", metadata: { email, role: invitation.role } });

  return profile;
}


export async function findAppUserByEmail(client: SupabaseClient, email: string) {
  const { data, error } = await client
    .from("app_users")
    .select("id,organization_id,name,email,role")
    .eq("email", email.toLowerCase())
    .maybeSingle<{ id: string; organization_id: string; name: string; email: string; role: string }>();
  if (error) throw error;
  return data;
}

export async function linkExistingUsersForStudent(client: SupabaseClient, student: StudentRow) {
  const links = [];
  if (student.guardian_email) {
    const parent = await findAppUserByEmail(client, student.guardian_email);
    if (parent) {
      const { data, error } = await client.from("user_student_links").upsert({
        organization_id: student.organization_id,
        app_user_id: parent.id,
        student_id: student.id,
        relationship: "PARENT",
        active: true,
      }, { onConflict: "app_user_id,student_id,relationship" }).select("*").single();
      if (error) throw error;
      links.push(data);
    }
  }
  if (student.student_email) {
    const studentUser = await findAppUserByEmail(client, student.student_email);
    if (studentUser) {
      const { data, error } = await client.from("user_student_links").upsert({
        organization_id: student.organization_id,
        app_user_id: studentUser.id,
        student_id: student.id,
        relationship: "STUDENT",
        active: true,
      }, { onConflict: "app_user_id,student_id,relationship" }).select("*").single();
      if (error) throw error;
      links.push(data);
    }
  }
  return links;
}

export async function getPortalStudentsForUser(client: SupabaseClient, userEmail: string, relationship: "PARENT" | "STUDENT") {
  const profile = await findAppUserByEmail(client, userEmail);
  if (!profile) return { profile: null, students: [] as Array<Record<string, unknown>> };

  const { data: linked, error: linkError } = await client
    .from("v_portal_student_links")
    .select("*")
    .eq("app_user_id", profile.id)
    .eq("relationship", relationship)
    .eq("active", true);
  if (linkError) throw linkError;

  let students = linked ?? [];
  if (!students.length && relationship === "PARENT") {
    const { data, error } = await client
      .from("students")
      .select("id,organization_id,admission_no,first_name,last_name,student_email,guardian_name,guardian_email,guardian_phone,risk_level,classrooms(name)")
      .eq("guardian_email", userEmail.toLowerCase());
    if (error) throw error;
    students = (data ?? []).map((student) => ({
      student_id: student.id,
      organization_id: student.organization_id,
      admission_no: student.admission_no,
      student_name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim(),
      student_email: student.student_email,
      guardian_name: student.guardian_name,
      guardian_email: student.guardian_email,
      guardian_phone: student.guardian_phone,
      risk_level: student.risk_level,
      classroom: relationName(student.classrooms),
      relationship: "PARENT",
    }));
  }

  if (!students.length && relationship === "STUDENT") {
    const { data, error } = await client
      .from("students")
      .select("id,organization_id,admission_no,first_name,last_name,student_email,guardian_name,guardian_email,guardian_phone,risk_level,classrooms(name)")
      .eq("student_email", userEmail.toLowerCase());
    if (error) throw error;
    students = (data ?? []).map((student) => ({
      student_id: student.id,
      organization_id: student.organization_id,
      admission_no: student.admission_no,
      student_name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim(),
      student_email: student.student_email,
      guardian_name: student.guardian_name,
      guardian_email: student.guardian_email,
      guardian_phone: student.guardian_phone,
      risk_level: student.risk_level,
      classroom: relationName(student.classrooms),
      relationship: "STUDENT",
    }));
  }

  return { profile, students };
}

export async function getStudentPortalBundle(client: SupabaseClient, userEmail: string, relationship: "PARENT" | "STUDENT") {
  const portal = await getPortalStudentsForUser(client, userEmail, relationship);
  const studentIds = portal.students.map((student) => String(student.student_id)).filter(Boolean);
  if (!studentIds.length) return { ...portal, invoices: [], results: [], attendance: [], receipts: [] };

  const [invoicesResult, resultsResult, attendanceResult] = await Promise.all([
    client.from("invoices").select("id,invoice_no,title,amount,amount_paid,status,due_date,student_id").in("student_id", studentIds),
    client.from("results").select("id,student_id,term,session,ca_score,exam_score,total_score,grade,remark,status,subjects(name)").in("student_id", studentIds),
    client.from("attendance_records").select("id,student_id,attendance_date,period,status,note").in("student_id", studentIds).order("attendance_date", { ascending: false }).limit(50),
  ]);
  if (invoicesResult.error) throw invoicesResult.error;
  if (resultsResult.error) throw resultsResult.error;
  if (attendanceResult.error) throw attendanceResult.error;

  const invoices = invoicesResult.data ?? [];
  const invoiceIds = invoices.map((row) => String(row.id)).filter(Boolean);
  const receipts = invoiceIds.length
    ? await client
        .from("payment_receipts")
        .select("id,receipt_no,reference,amount,issued_at,invoice_id,payer_email,provider")
        .in("invoice_id", invoiceIds)
        .order("issued_at", { ascending: false })
        .then(
          (result) => {
            if (result.error) throw result.error;
            return result.data ?? [];
          },
        )
    : [];

  return {
    ...portal,
    invoices,
    results: resultsResult.data ?? [],
    attendance: attendanceResult.data ?? [],
    receipts,
  };
}

export async function recordVerifiedPayment(client: SupabaseClient, input: {
  invoiceNo: string;
  invoiceId?: string;
  reference: string;
  amount: number;
  provider: string;
  payerEmail?: string;
  metadata?: Record<string, unknown>;
}) {
  const invoice = input.invoiceId
    ? await getLiveInvoiceById(client, input.invoiceId)
    : await getLiveInvoice(client, input.invoiceNo);
  if (!invoice) throw new Error("Invoice not found");

  const paid = Number(invoice.amount_paid ?? 0);
  const amount = Number(invoice.amount ?? 0);
  const nextPaid = Math.min(amount, paid + input.amount);
  const status = nextPaid >= amount ? "PAID" : nextPaid > 0 ? "PARTIAL" : "PENDING";

  const { data: payment, error: paymentError } = await client
    .from("payments")
    .upsert({
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      amount: input.amount,
      provider: input.provider,
      reference: input.reference,
      paid_at: new Date().toISOString(),
      metadata: input.metadata ?? {},
    }, { onConflict: "reference" })
    .select("*")
    .single();
  if (paymentError) throw paymentError;

  const { error: invoiceError } = await client
    .from("invoices")
    .update({ amount_paid: nextPaid, status })
    .eq("id", invoice.id);
  if (invoiceError) throw invoiceError;

  const receiptNo = `RCPT-${input.reference}`;
  const { data: receipt, error: receiptError } = await client
    .from("payment_receipts")
    .upsert({
      organization_id: payment.organization_id,
      invoice_id: invoice.id,
      payment_id: payment.id,
      receipt_no: receiptNo,
      payer_email: input.payerEmail ?? null,
      amount: input.amount,
      provider: input.provider,
      reference: input.reference,
      metadata: input.metadata ?? {},
    }, { onConflict: "reference" })
    .select("*")
    .single();
  if (receiptError) throw receiptError;
  await writeAuditEvent(client, { organizationId: payment.organization_id, action: "payment.verified", resourceType: "payment", resourceId: payment.id, riskLevel: "High", metadata: { invoiceNo: input.invoiceNo, reference: input.reference, amount: input.amount, status } });

  return { payment, receipt, invoiceStatus: status, amountPaid: nextPaid };
}

export async function getReceiptByReference(client: SupabaseClient, reference: string) {
  const { data, error } = await client
    .from("v_payment_receipts")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ResultPublishInput = {
  admissionNo: string;
  term: string;
  session: string;
  action: "publish" | "unlock";
  actorEmail?: string;
  note?: string;
};

export async function publishOrUnlockResults(client: SupabaseClient, input: ResultPublishInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const student = await getStudentByAdmission(client, organization.id, input.admissionNo);
  if (!student) throw new Error(`Student ${input.admissionNo} not found`);

  const update = input.action === "publish"
    ? { status: "PUBLISHED", published_at: new Date().toISOString(), locked_at: new Date().toISOString(), unlocked_at: null, lock_reason: input.note ?? "Published by authorized user" }
    : { status: "REVIEW", unlocked_at: new Date().toISOString(), locked_at: null, lock_reason: input.note ?? "Unlocked for correction" };

  const { data, error } = await client
    .from("results")
    .update(update)
    .eq("student_id", student.id)
    .eq("term", input.term)
    .eq("session", input.session)
    .select("*");
  if (error) throw error;
  if (!data?.length) throw new Error("No result records found for this student, term and session");

  const { error: eventError } = await client.from("result_publication_events").insert({
    organization_id: organization.id,
    student_id: student.id,
    term: input.term,
    session: input.session,
    action: input.action,
    actor_email: input.actorEmail ?? null,
    note: input.note ?? null,
  });
  if (eventError) throw eventError;
  await writeAuditEvent(client, { organizationId: organization.id, ...actorFields(actor), action: `results.${input.action}`, resourceType: "results", resourceId: student.id, riskLevel: input.action === "publish" ? "High" : "Medium", metadata: { admissionNo: student.admission_no, term: input.term, session: input.session } });

  return { student, updated: data.length, action: input.action };
}

export async function getResultPublicationEvents(client: SupabaseClient) {
  const organization = await getOrganizationForWrite(client);
  const { data, error } = await client
    .from("result_publication_events")
    .select("id,student_id,term,session,action,actor_email,note,created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export type AnnouncementInput = {
  title: string;
  body: string;
  audience?: string;
  publish?: boolean;
};

export async function listAnnouncements(client: SupabaseClient, page?: PageInput) {
  const organization = await getOrganizationForWrite(client);
  const { limit, offset } = pageParams(page);
  const { data, error, count } = await client
    .from("announcements")
    .select("id,organization_id,title,body,audience,published_at,created_at", { count: "exact" })
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const rows = data ?? [];
  const total = count ?? rows.length;
  return { data: rows, page: { total, limit, offset, hasMore: offset + rows.length < total } as PageInfo };
}

export async function createAnnouncement(client: SupabaseClient, input: AnnouncementInput, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const { data, error } = await client
    .from("announcements")
    .insert({
      organization_id: organization.id,
      title: input.title,
      body: input.body,
      audience: input.audience ?? "ALL",
      published_at: input.publish ? new Date().toISOString() : null,
    })
    .select("id,organization_id,title,body,audience,published_at,created_at")
    .single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: "announcement.create", resourceType: "announcement", resourceId: data.id, metadata: { audience: data.audience, published: Boolean(data.published_at) } });
  return data;
}

export async function getCommunicationSummary(client: SupabaseClient) {
  const { data, error } = await client.from("v_communication_summary").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCommunicationDeliveries(client: SupabaseClient) {
  const organization = await getOrganizationForWrite(client);
  const { data, error } = await client
    .from("communication_deliveries")
    .select("id,organization_id,announcement_id,channel,recipient_email,subject,status,provider,provider_message_id,error_message,sent_at,created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function recordCommunicationDelivery(client: SupabaseClient, input: {
  announcementId?: string;
  recipientEmail: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}, actor?: ActorInput) {
  const organization = await getOrganizationForWrite(client);
  const { data, error } = await client
    .from("communication_deliveries")
    .insert({
      organization_id: organization.id,
      announcement_id: input.announcementId ?? null,
      channel: "email",
      recipient_email: input.recipientEmail.toLowerCase(),
      subject: input.subject,
      status: input.status,
      provider: input.provider ?? null,
      provider_message_id: input.providerMessageId ?? null,
      error_message: input.errorMessage ?? null,
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: data.organization_id, ...actorFields(actor), action: `communication.delivery.${input.status}`, resourceType: "communication_delivery", resourceId: data.id, riskLevel: input.status === "failed" ? "Medium" : "Low", metadata: { recipientEmail: input.recipientEmail, subject: input.subject } });
  return data;
}

export async function writeAuditEvent(client: SupabaseClient, input: {
  organizationId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  riskLevel?: "Low" | "Medium" | "High";
  metadata?: Record<string, unknown>;
}) {
  let organizationId = input.organizationId;
  if (!organizationId) {
    const organization = await getPrimaryOrganization(client).catch(() => null);
    organizationId = organization?.id;
  }
  const { error } = await client.from("audit_events").insert({
    organization_id: organizationId ?? null,
    actor_name: input.actorEmail ?? null,
    actor_role: input.actorRole ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    risk_level: input.riskLevel ?? "Low",
    metadata: input.metadata ?? {},
  });
  if (error) console.error("audit_event_failed", error.message);
}

export type SupportTicketInput = {
  requesterEmail?: string;
  requesterName?: string;
  category?: string;
  priority?: string;
  subject: string;
  description: string;
  path?: string;
};

export type ErrorEventInput = {
  userEmail?: string;
  source?: string;
  severity?: string;
  message: string;
  stack?: string;
  path?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAppError(client: SupabaseClient, input: ErrorEventInput) {
  const organization = await getPrimaryOrganization(client).catch(() => null);
  const { data, error } = await client.from("app_error_events").insert({
    organization_id: organization?.id ?? null,
    user_email: input.userEmail ?? null,
    source: input.source ?? "server",
    severity: input.severity ?? "error",
    message: input.message,
    stack: input.stack ?? null,
    path: input.path ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  }).select("*").single();
  if (error) throw error;
  return data;
}

export async function listAppErrors(client: SupabaseClient) {
  const organization = await getPrimaryOrganization(client).catch(() => null);
  let query = client.from("app_error_events").select("id,user_email,source,severity,message,path,resolved,created_at").order("created_at", { ascending: false }).limit(100);
  if (organization?.id) query = query.eq("organization_id", organization.id);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSupportTicket(client: SupabaseClient, input: SupportTicketInput) {
  const organization = await getPrimaryOrganization(client).catch(() => null);
  const { data, error } = await client.from("support_tickets").insert({
    organization_id: organization?.id ?? null,
    requester_email: input.requesterEmail ?? null,
    requester_name: input.requesterName ?? null,
    category: input.category ?? "general",
    priority: input.priority ?? "normal",
    subject: input.subject,
    description: input.description,
    status: "open",
    metadata: { path: input.path ?? null },
  }).select("*").single();
  if (error) throw error;
  await writeAuditEvent(client, { organizationId: organization?.id, action: "support.ticket.create", resourceType: "support_ticket", resourceId: data.id, riskLevel: input.priority === "urgent" ? "High" : "Low", metadata: { subject: input.subject, category: input.category } });
  return data;
}

export async function listSupportTickets(client: SupabaseClient) {
  const organization = await getPrimaryOrganization(client).catch(() => null);
  let query = client.from("support_tickets").select("id,requester_email,requester_name,category,priority,subject,description,status,created_at,updated_at").order("created_at", { ascending: false }).limit(100);
  if (organization?.id) query = query.eq("organization_id", organization.id);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSupportSummary(client: SupabaseClient) {
  const { data, error } = await client.from("v_support_operations_summary").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

type SnapshotTotals = {
  students: number;
  attendanceRate: number;
  outstanding: number;
  unpaidInvoices: number;
  publishedRate: number;
};

/**
 * Figures for the operations overview.
 *
 * Counts are requested with `head: true` so the database returns totals without
 * transferring rows, which keeps the dashboard responsive on slow connections.
 * Row level security scopes every count to the caller's school.
 */
export async function getCommandCenterSnapshot(client: SupabaseClient): Promise<{
  organization: OrganizationRow | null;
  totals: SnapshotTotals;
}> {
  const organization = await getPrimaryOrganization(client);

  const today = new Date().toISOString().slice(0, 10);

  const [students, attendanceToday, presentToday, invoices, resultTotal, resultPublished] = await Promise.all([
    client.from("students").select("id", { count: "exact", head: true }).eq("active", true),
    client.from("attendance_records").select("id", { count: "exact", head: true }).eq("attendance_date", today),
    client.from("attendance_records").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "PRESENT"),
    client.from("invoices").select("amount,amount_paid,status"),
    client.from("results").select("id", { count: "exact", head: true }),
    client.from("results").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
  ]);

  const invoiceRows = (invoices.data ?? []) as Array<{ amount: string | number; amount_paid: string | number; status: string }>;
  const outstanding = invoiceRows.reduce((total, row) => total + (Number(row.amount ?? 0) - Number(row.amount_paid ?? 0)), 0);
  const unpaidInvoices = invoiceRows.filter((row) => row.status !== "PAID").length;

  const resultCount = resultTotal.count ?? 0;
  const publishedRate = resultCount > 0
    ? Math.round(((resultPublished.count ?? 0) / resultCount) * 100)
    : 0;

  const markedToday = attendanceToday.count ?? 0;
  const attendanceRate = markedToday ? Math.round(((presentToday.count ?? 0) / markedToday) * 100) : 0;

  return {
    organization,
    totals: {
      students: students.count ?? 0,
      attendanceRate,
      outstanding: Math.max(outstanding, 0),
      unpaidInvoices,
      publishedRate,
    },
  };
}

/**
 * Live context for the insight engine.
 *
 * Each query is independent, so a missing view or an empty table degrades to
 * an empty section rather than failing the whole briefing. Row level security
 * scopes every query to the caller's school through the request client.
 */
export async function getInsightContext(client: SupabaseClient): Promise<InsightContext> {
  const empty: InsightContext = {
    schoolName: null,
    students: 0,
    teachers: 0,
    classes: 0,
    attendanceRate: 0,
    highRisk: 0,
    mediumRisk: 0,
    risks: [],
    finance: null,
    overdueInvoices: [],
    attendanceDaily: [],
    classAttendance: [],
    resultTerms: [],
  };

  const organization = await getPrimaryOrganization(client).catch(() => null);
  if (!organization) return empty;

  const fortnightAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [metrics, risks, finance, overdue, daily, recent, terms] = await Promise.all([
    client.from("v_school_operating_metrics").select("*").eq("organization_id", organization.id).limit(1).maybeSingle().then(
      (result) => result.data,
      () => null,
    ),
    client.from("v_student_risk_scores").select("*").eq("organization_id", organization.id).order("risk_score", { ascending: false }).limit(8).then(
      (result) => (result.data ?? []) as RiskRow[],
      () => [] as RiskRow[],
    ),
    client.from("v_finance_summary").select("*").eq("organization_id", organization.id).limit(1).maybeSingle().then(
      (result) => result.data as FinanceSummary | null,
      () => null,
    ),
    client.from("invoices").select("invoice_no,title,amount,amount_paid,due_date,students(admission_no,first_name,last_name)").eq("organization_id", organization.id).neq("status", "PAID").order("due_date", { ascending: true, nullsFirst: false }).limit(10).then(
      (result) => result.data ?? [],
      () => [],
    ),
    client.from("v_attendance_daily").select("*").eq("organization_id", organization.id).order("attendance_date", { ascending: false }).limit(14).then(
      (result) => (result.data ?? []) as AttendanceDay[],
      () => [] as AttendanceDay[],
    ),
    client.from("attendance_records").select("status,classrooms(name)").eq("organization_id", organization.id).gte("attendance_date", fortnightAgo).limit(500).then(
      (result) => result.data ?? [],
      () => [],
    ),
    client.from("v_results_summary").select("*").eq("organization_id", organization.id).limit(5).then(
      (result) => (result.data ?? []) as ResultTerm[],
      () => [] as ResultTerm[],
    ),
  ]);

  const byClass = new Map<string, { marked: number; present: number; absent: number }>();
  for (const row of recent as Array<{ status: string; classrooms: { name: string } | { name: string }[] | null }>) {
    const name = relationName(row.classrooms) ?? "Unassigned";
    const entry = byClass.get(name) ?? { marked: 0, present: 0, absent: 0 };
    entry.marked += 1;
    if (row.status === "PRESENT") entry.present += 1;
    if (row.status === "ABSENT") entry.absent += 1;
    byClass.set(name, entry);
  }
  const classAttendance: ClassAttendance[] = [...byClass.entries()].map(([classroom, entry]) => ({
    classroom,
    marked: entry.marked,
    present: entry.present,
    absent: entry.absent,
    rate: entry.marked > 0 ? Math.round((entry.present / entry.marked) * 100) : 0,
  }));

  const summary = (metrics ?? {}) as Record<string, number | string | null>;
  const toNumber = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    schoolName: organization.name,
    students: toNumber(summary.students_count),
    teachers: toNumber(summary.teachers_count),
    classes: toNumber(summary.classes_count),
    attendanceRate: Math.round(toNumber(summary.attendance_rate)),
    highRisk: toNumber(summary.high_risk_students),
    mediumRisk: toNumber(summary.medium_risk_students),
    risks,
    finance,
    overdueInvoices: (overdue as Array<{ invoice_no: string | null; title: string | null; amount: string | number; amount_paid: string | number; due_date: string | null; students: { admission_no: string; first_name: string; last_name: string } | null }>).map((row) => ({
      invoice_no: row.invoice_no,
      title: row.title,
      balance: Math.max(Number(row.amount ?? 0) - Number(row.amount_paid ?? 0), 0),
      due_date: row.due_date,
      admission_no: row.students?.admission_no ?? null,
      student_name: row.students ? `${row.students.first_name ?? ""} ${row.students.last_name ?? ""}`.trim() || null : null,
    })),
    attendanceDaily: daily,
    classAttendance,
    resultTerms: terms,
  };
}

export type RegisterMark = {
  admissionNo: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  note?: string;
};

export type RegisterSubmitInput = {
  date?: string;
  period?: string;
  marks: RegisterMark[];
};

export type ActorInput = {
  email?: string;
  role?: string;
};

function actorFields(actor?: ActorInput) {
  return { actorEmail: actor?.email, actorRole: actor?.role };
}

/**
 * Live class register: the school's classes, the students in them and any
 * marks already saved for today, so the register opens pre-filled rather
 * than blank.
 */
export async function getClassRegister(client: SupabaseClient, className?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const organization = await getPrimaryOrganization(client);

  const classesQuery = client.from("classrooms").select("name").order("name", { ascending: true });
  if (organization) classesQuery.eq("organization_id", organization.id);

  let studentsQuery = client
    .from("students")
    .select("admission_no,first_name,last_name,classrooms(name)")
    .eq("active", true)
    .order("first_name", { ascending: true})
    .order("last_name", { ascending: true });
  if (organization) studentsQuery = studentsQuery.eq("organization_id", organization.id);

  const marksQuery = client
    .from("attendance_records")
    .select("status,students(admission_no)")
    .eq("attendance_date", today);

  const [classesResult, studentsResult, marksResult] = await Promise.all([classesQuery, studentsQuery, marksQuery]);
  if (classesResult.error) throw classesResult.error;
  if (studentsResult.error) throw studentsResult.error;
  if (marksResult.error) throw marksResult.error;

  const classes = ((classesResult.data ?? []) as Array<{ name: string }>).map((row) => row.name);
  const students = ((studentsResult.data ?? []) as Array<{
    admission_no: string;
    first_name: string;
    last_name: string;
    classrooms: { name: string } | { name: string }[] | null;
  }>).map((row) => ({
    admissionNo: row.admission_no,
    name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.admission_no,
    classroom: relationName(row.classrooms) ?? "Unassigned",
  }));
  const filtered = className ? students.filter((student) => student.classroom === className) : students;

  const marks: Record<string, string> = {};
  const markRows = (marksResult.data ?? []) as unknown as Array<{ status: string; students: { admission_no: string } | Array<{ admission_no: string }> | null }>;
  for (const row of markRows) {
    const linked = Array.isArray(row.students) ? row.students[0] : row.students;
    if (linked?.admission_no) marks[linked.admission_no] = row.status;
  }

  return { date: today, classes, students: filtered, marks };
}

/**
 * Saves a whole register in one round trip.
 *
 * A class of forty submits as a single upsert rather than forty requests,
 * which is what keeps marking usable on slow connections. Unknown admission
 * numbers are reported back instead of failing the batch, so one stale row
 * never discards the other thirty-nine.
 */
export async function submitAttendanceRegister(
  client: SupabaseClient,
  input: RegisterSubmitInput,
  actor?: ActorInput,
) {
  const organization = await getOrganizationForWrite(client);
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const period = input.period ?? "Morning";

  const admissionNumbers = [...new Set(input.marks.map((mark) => mark.admissionNo))];
  const { data: students, error: studentsError } = await client
    .from("students")
    .select("id,admission_no,classroom_id")
    .eq("organization_id", organization.id)
    .in("admission_no", admissionNumbers);
  if (studentsError) throw studentsError;

  const byAdmission = new Map((students ?? []).map((row: { id: string; admission_no: string; classroom_id: string | null }) => [row.admission_no, row]));
  const rows = [];
  const unknown: string[] = [];
  for (const mark of input.marks) {
    const student = byAdmission.get(mark.admissionNo);
    if (!student) {
      unknown.push(mark.admissionNo);
      continue;
    }
    rows.push({
      organization_id: organization.id,
      student_id: student.id,
      classroom_id: student.classroom_id,
      attendance_date: date,
      period,
      status: mark.status,
      note: mark.note ?? null,
    });
  }

  if (rows.length) {
    const { error } = await client.from("attendance_records").upsert(rows, { onConflict: "student_id,attendance_date,period" });
    if (error) throw error;
  }

  await writeAuditEvent(client, {
    organizationId: organization.id,
    ...actorFields(actor),
    action: "attendance.register_submit",
    resourceType: "attendance",
    riskLevel: "Medium",
    metadata: { date, period, saved: rows.length, unknown },
  });

  return { saved: rows.length, unknown, date, period };
}

export type AuditEventRow = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  risk_level: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/**
 * Recent audit events for the caller's school, newest first.
 *
 * An optional action prefix (or comma-separated prefixes) narrows the feed,
 * so the finance desk can show invoice and payment activity without its own
 * endpoint. Row level security scopes the feed to the caller's school.
 */
export async function listAuditEvents(client: SupabaseClient, prefixes?: string, limit = 100) {
  let query = client
    .from("audit_events")
    .select("id,actor_name,actor_role,action,resource_type,resource_id,risk_level,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 200)));

  const wanted = (prefixes ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (wanted.length === 1) {
    query = query.like("action", `${wanted[0].replace(/[%_]/g, "")}%`);
  } else if (wanted.length > 1) {
    query = query.or(wanted.map((prefix) => `action.like.${prefix.replace(/[%_]/g, "")}%`).join(","));
  }

  const { data, error } = await query.returns<AuditEventRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getAuditSummary(client: SupabaseClient) {
  const events = await listAuditEvents(client, undefined, 200);
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: events.length,
    today: events.filter((event) => event.created_at.slice(0, 10) === today).length,
    highRisk: events.filter((event) => event.risk_level === "High").length,
    needsReview: events.filter((event) => event.risk_level === "High" || event.risk_level === "Medium").length,
  };
}

export type TeacherRow = {
  id: string;
  staff_no: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  title: string | null;
  active: boolean;
};

/** Staff directory for the caller's school. */
export async function listTeachers(client: SupabaseClient) {
  const { data, error } = await client
    .from("teachers")
    .select("id,staff_no,name,email,phone,department,title,active")
    .order("name", { ascending: true })
    .returns<TeacherRow[]>();
  if (error) throw error;
  return data ?? [];
}

export type RosterRow = {
  admissionNo: string;
  name: string;
  classroom: string;
};

/**
 * Minimal roster for score entry.
 *
 * Teachers need names and admission numbers to enter results but must not
 * gain the full student-management read, so this stays a narrow endpoint
 * rather than reusing the student directory.
 */
export async function listRoster(client: SupabaseClient, className?: string) {
  const query = client
    .from("students")
    .select("admission_no,first_name,last_name,classrooms(name)")
    .eq("active", true)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  const roster = ((data ?? []) as Array<{
    admission_no: string;
    first_name: string;
    last_name: string;
    classrooms: { name: string } | { name: string }[] | null;
  }>).map((row) => ({
    admissionNo: row.admission_no,
    name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.admission_no,
    classroom: relationName(row.classrooms) ?? "Unassigned",
  }));
  return className ? roster.filter((row) => row.classroom === className) : roster;
}

export type ReportCardBundle = {
  student: {
    admission_no: string;
    name: string;
    classroom: string;
  };
  organizationName: string | null;
  term: string;
  session: string;
  status: string;
  subjects: Array<{
    name: string;
    ca: number;
    exam: number;
    total: number;
    grade: string | null;
    remark: string | null;
  }>;
  average: number;
  attendanceRate: number | null;
  position: string | null;
  teacherComment: string | null;
  principalComment: string | null;
};

/**
 * Everything a report card prints, computed from live records.
 *
 * Position is the student's rank by average among classmates with results
 * for the same term and session; attendance is their present-rate across
 * submitted registers. Either is null when the underlying records do not
 * exist yet, and the card says so instead of inventing a figure.
 */
export async function getReportCardBundle(client: SupabaseClient, admissionNo: string): Promise<ReportCardBundle | null> {
  const organization = await getPrimaryOrganization(client);
  const student = organization ? await getStudentByAdmission(client, organization.id, admissionNo) : null;
  if (!organization || !student) return null;

  const [resultsResult, attendanceResult, peersResult] = await Promise.all([
    client.from("results").select("term,session,ca_score,exam_score,total_score,grade,remark,status,teacher_comment,principal_comment,subjects(name)").eq("student_id", student.id).order("created_at", { ascending: false }),
    client.from("attendance_records").select("id", { count: "exact", head: true }).eq("student_id", student.id),
    student.classroom_id
      ? client.from("results").select("student_id,total_score,term,session,students!inner(classroom_id)").eq("students.classroom_id", student.classroom_id)
      : Promise.resolve({ data: [], error: null } as unknown as { data: Array<{ student_id: string; total_score: string | number; term: string; session: string }>; error: null }),
  ]);
  if (resultsResult.error) throw resultsResult.error;
  if (attendanceResult.error) throw attendanceResult.error;

  const rows = (resultsResult.data ?? []) as Array<{
    term: string; session: string; ca_score: string | number; exam_score: string | number;
    total_score: string | number; grade: string | null; remark: string | null; status: string;
    teacher_comment: string | null; principal_comment: string | null;
    subjects: { name: string } | Array<{ name: string }> | null;
  }>;
  if (!rows.length) return null;

  const term = rows[0].term;
  const session = rows[0].session;
  const termRows = rows.filter((row) => row.term === term && row.session === session);
  const subjects = termRows.map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return {
      name: subject?.name ?? "Subject",
      ca: Number(row.ca_score ?? 0),
      exam: Number(row.exam_score ?? 0),
      total: Number(row.total_score ?? 0),
      grade: row.grade,
      remark: row.remark,
    };
  });
  const average = subjects.length ? Math.round(subjects.reduce((sum, row) => sum + row.total, 0) / subjects.length) : 0;

  let attendanceRate: number | null = null;
  const marked = attendanceResult.count ?? 0;
  if (marked > 0) {
    const { count: present } = await client.from("attendance_records").select("id", { count: "exact", head: true }).eq("student_id", student.id).eq("status", "PRESENT");
    attendanceRate = Math.round(((present ?? 0) / marked) * 100);
  }

  let position: string | null = null;
  const peerRows = (peersResult.data ?? []) as Array<{ student_id: string; total_score: string | number; term: string; session: string }>;
  const peerAverages = new Map<string, { total: number; count: number }>();
  for (const row of peerRows) {
    if (row.term !== term || row.session !== session) continue;
    const entry = peerAverages.get(row.student_id) ?? { total: 0, count: 0 };
    entry.total += Number(row.total_score ?? 0);
    entry.count += 1;
    peerAverages.set(row.student_id, entry);
  }
  if (peerAverages.size > 1) {
    const ranked = [...peerAverages.entries()]
      .map(([id, entry]) => ({ id, average: entry.count ? entry.total / entry.count : 0 }))
      .sort((a, b) => b.average - a.average);
    const rank = ranked.findIndex((entry) => entry.id === student.id) + 1;
    if (rank > 0) {
      const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
      position = `${rank}${suffix} of ${ranked.length}`;
    }
  }

  const classroom = student.classroom_id
    ? await client.from("classrooms").select("name").eq("id", student.classroom_id).maybeSingle<{ name: string }>().then((result) => result.data?.name ?? "Unassigned", () => "Unassigned")
    : "Unassigned";

  return {
    student: {
      admission_no: student.admission_no,
      name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.admission_no,
      classroom,
    },
    organizationName: organization.name,
    term,
    session,
    status: termRows[0]?.status ?? "DRAFT",
    subjects,
    average,
    attendanceRate,
    position,
    teacherComment: termRows.find((row) => row.teacher_comment)?.teacher_comment ?? null,
    principalComment: termRows.find((row) => row.principal_comment)?.principal_comment ?? null,
  };
}

export type StudentProfile = {
  student: StudentRow & { classroom: string };
  risk: {
    level: string;
    score: number;
    attendanceRate: number;
    absent: number;
    balance: number;
    overdue: number;
    average: number;
  } | null;
  invoices: Array<{ invoice_no: string; title: string; amount: number; paid: number; status: string; due_date: string | null }>;
  attendance: Array<{ date: string; period: string | null; status: string }>;
  results: { subjects: number; average: number; published: number };
};

/**
 * Full student profile for the 360 view.
 *
 * Combines the record, computed risk, invoices, recent registers and result
 * averages. Sections without records come back empty and the page says so.
 */
export async function getStudentProfile(client: SupabaseClient, identifier: string): Promise<StudentProfile | null> {
    const organization = await getPrimaryOrganization(client);
    if (!organization) return null;

    let student = await getStudentByAdmission(client, organization.id, identifier);
    
    if (!student) {
        const { data: studentById } = await client
            .from("students")
            .select("*")
            .eq("id", identifier)
            .eq("organization_id", organization.id)
            .maybeSingle();
        student = studentById;
    }

    if (!student) return null;

  const classroom = student.classroom_id
    ? await client.from("classrooms").select("name").eq("id", student.classroom_id).maybeSingle<{ name: string }>().then((result) => result.data?.name ?? "Unassigned", () => "Unassigned")
    : "Unassigned";

  const [riskResult, invoicesResult, attendanceResult, resultsResult] = await Promise.all([
    client.from("v_student_risk_scores").select("risk_level_computed,risk_score,attendance_rate,absent_count,outstanding_balance,overdue_invoices,average_score").eq("student_id", student.id).limit(1).maybeSingle(),
    client.from("invoices").select("invoice_no,title,amount,amount_paid,status,due_date").eq("student_id", student.id).order("created_at", { ascending: false }).limit(20),
    client.from("attendance_records").select("attendance_date,period,status").eq("student_id", student.id).order("attendance_date", { ascending: false }).limit(20),
    client.from("results").select("total_score,status").eq("student_id", student.id),
  ]);

  const riskRow = (riskResult.data ?? null) as Record<string, string | number | null> | null;
  const invoiceRows = (invoicesResult.data ?? []) as Array<{ invoice_no: string; title: string; amount: string | number; amount_paid: string | number; status: string; due_date: string | null }>;
  const attendanceRows = (attendanceResult.data ?? []) as Array<{ attendance_date: string; period: string | null; status: string }>;
  const resultRows = (resultsResult.data ?? []) as Array<{ total_score: string | number; status: string }>;

  return {
    student: { ...student, classroom },
    risk: riskRow
      ? {
          level: String(riskRow.risk_level_computed ?? "Low"),
          score: Number(riskRow.risk_score ?? 0),
          attendanceRate: Number(riskRow.attendance_rate ?? 0),
          absent: Number(riskRow.absent_count ?? 0),
          balance: Number(riskRow.outstanding_balance ?? 0),
          overdue: Number(riskRow.overdue_invoices ?? 0),
          average: Number(riskRow.average_score ?? 0),
        }
      : null,
    invoices: invoiceRows.map((row) => ({ invoice_no: row.invoice_no, title: row.title, amount: Number(row.amount ?? 0), paid: Number(row.amount_paid ?? 0), status: row.status, due_date: row.due_date })),
    attendance: attendanceRows.map((row) => ({ date: row.attendance_date, period: row.period, status: row.status })),
    results: {
      subjects: resultRows.length,
      average: resultRows.length ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.total_score ?? 0), 0) / resultRows.length) : 0,
      published: resultRows.filter((row) => row.status === "PUBLISHED").length,
    },
  };
}

/**
 * Admission numbers linked to a portal account.
 *
 * Parents and students authenticate like anyone else, so row level security
 * admits them to their school's tables — but they must only ever see their
 * own children's rows. These helpers are the second half of that boundary:
 * every portal-facing read filters through them.
 */
export async function linkedAdmissionNumbers(
  client: SupabaseClient,
  userEmail: string,
  relationship: "PARENT" | "STUDENT",
): Promise<Set<string>> {
  const { students } = await getPortalStudentsForUser(client, userEmail, relationship);
  return new Set(
    students
      .map((student) => String(student.admission_no ?? "").trim().toUpperCase())
      .filter(Boolean),
  );
}

/** Staff always pass; portal roles must hold a link to the student. */
export async function hasPortalLink(
  client: SupabaseClient,
  userEmail: string | undefined,
  role: string,
  admissionNo: string,
): Promise<boolean> {
  if (role !== "PARENT" && role !== "STUDENT") return true;
  if (!userEmail) return false;
  const linked = await linkedAdmissionNumbers(client, userEmail, role);
  return linked.has(admissionNo.trim().toUpperCase());
}

type LinkedRow = {
  students?: { admission_no?: unknown } | Array<{ admission_no?: unknown }> | null;
};

/**
 * Narrows joined rows to a portal account's linked students.
 *
 * Staff pass through untouched; parents and students keep only rows whose
 * joined student is linked to their account. Used by list endpoints whose
 * permission (view results, fees, attendance) portal roles legitimately
 * hold but must never enjoy school-wide.
 */
export async function filterLinkedRows<T extends LinkedRow>(
  client: SupabaseClient,
  userEmail: string | undefined,
  role: string,
  rows: T[],
): Promise<T[]> {
  if (role !== "PARENT" && role !== "STUDENT") return rows;
  if (!userEmail) return [];
  const linked = await linkedAdmissionNumbers(client, userEmail, role);
  return rows.filter((row) => {
    const joined = Array.isArray(row.students) ? row.students[0] : row.students;
    return linked.has(String(joined?.admission_no ?? "").trim().toUpperCase());
  });
}

function cleanEmail(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** Stores the canonical +234 form when the input parses; keeps the raw value otherwise. */
function canonicalPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  return normaliseNigerianPhone(value) ?? value;
}

/**
 * Bulk student enrolment in a fixed handful of queries.
 *
 * Importing row-by-row costs a classroom lookup, an upsert, two user
 * lookups, link writes and an audit event per student — a 500-row CSV would
 * run thousands of sequential round trips and outlive the request. This
 * resolves classrooms and users once each, upserts students and links in
 * bulk, and writes one audit event for the batch.
 */
export async function createLiveStudentsBulk(
  client: SupabaseClient,
  inputs: StudentCreateInput[],
  actor?: ActorInput,
): Promise<{ students: StudentRow[]; linked: number }> {
  const organization = await getOrganizationForWrite(client);

  const classNames = [...new Set(inputs.map((input) => input.className?.trim()).filter(Boolean))] as string[];
  const classroomByName = new Map<string, string>();
  if (classNames.length) {
    const { data, error } = await client
      .from("classrooms")
      .select("id,name")
      .eq("organization_id", organization.id)
      .in("name", classNames);
    if (error) throw error;
    for (const row of (data ?? []) as ClassroomRow[]) classroomByName.set(row.name, row.id);
  }

  const payloads = inputs.map((input) => ({
    organization_id: organization.id,
    classroom_id: input.className?.trim() ? classroomByName.get(input.className.trim()) ?? null : null,
    admission_no: input.admissionNo.trim(),
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    gender: input.gender ?? null,
    guardian_name: input.guardianName ?? null,
    guardian_phone: canonicalPhone(input.guardianPhone),
    guardian_email: cleanEmail(input.guardianEmail),
    student_email: cleanEmail(input.studentEmail),
    risk_level: input.riskLevel ?? "Low",
  }));

  const { data: students, error: studentsError } = await client
    .from("students")
    .upsert(payloads, { onConflict: "organization_id,admission_no" })
    .select("*")
    .returns<StudentRow[]>();
  if (studentsError) throw studentsError;

  const emails = [...new Set(
    (students ?? []).flatMap((row) => [row.guardian_email, row.student_email]).filter(Boolean),
  )] as string[];
  const userByEmail = new Map<string, { id: string }>();
  if (emails.length) {
    const { data, error } = await client.from("app_users").select("id,email").in("email", emails);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; email: string }>) userByEmail.set(row.email.toLowerCase(), row);
  }

  const links = [];
  for (const row of students ?? []) {
    const parent = row.guardian_email ? userByEmail.get(row.guardian_email.toLowerCase()) : undefined;
    if (parent) {
      links.push({ organization_id: row.organization_id, app_user_id: parent.id, student_id: row.id, relationship: "PARENT", active: true });
    }
    const pupil = row.student_email ? userByEmail.get(row.student_email.toLowerCase()) : undefined;
    if (pupil) {
      links.push({ organization_id: row.organization_id, app_user_id: pupil.id, student_id: row.id, relationship: "STUDENT", active: true });
    }
  }
  if (links.length) {
    const { error } = await client.from("user_student_links").upsert(links, { onConflict: "app_user_id,student_id,relationship" });
    if (error) throw error;
  }

  await writeAuditEvent(client, {
    organizationId: organization.id,
    ...actorFields(actor),
    action: "students.upsert_bulk",
    resourceType: "students",
    riskLevel: "Medium",
    metadata: { count: payloads.length, linked: links.length },
  });

  return { students: students ?? [], linked: links.length };
}

export type FinanceSummaryTotals = {
  total: number;
  paid: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  invoiceCount: number;
  collectionRate: number;
};

/** Workspace-wide fee totals from the finance summary view (not the page). */
export async function getFinanceSummaryTotals(client: SupabaseClient): Promise<FinanceSummaryTotals> {
  const { data, error } = await client
    .from("v_finance_summary")
    .select("total_billed,total_collected,total_outstanding,overdue_count,paid_count,invoice_count")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = (data ?? {}) as Record<string, string | number | null>;
  const total = Number(row.total_billed ?? 0);
  const paid = Number(row.total_collected ?? 0);
  const outstanding = Math.max(0, Number(row.total_outstanding ?? total - paid));
  return {
    total,
    paid,
    outstanding,
    overdue: outstanding,
    overdueCount: Number(row.overdue_count ?? 0),
    invoiceCount: Number(row.invoice_count ?? 0),
    collectionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
  };
}

export type ResultsSummaryTotals = {
  records: number;
  average: number;
  draft: number;
  review: number;
  approved: number;
  published: number;
};

/**
 * Workspace-wide result counts from the results summary view (not the page).
 * Reported in records rather than students: the view groups by term and
 * session, so summing its student counts would count multi-term students
 * twice.
 */
export async function getResultsSummaryTotals(client: SupabaseClient): Promise<ResultsSummaryTotals> {
  const { data, error } = await client
    .from("v_results_summary")
    .select("average_score,draft_count,review_count,approved_count,published_count,subject_results")
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, string | number | null>>;
  let weighted = 0;
  let subjects = 0;
  const totals = { draft: 0, review: 0, approved: 0, published: 0 };
  for (const row of rows) {
    const count = Number(row.subject_results ?? 0);
    weighted += Number(row.average_score ?? 0) * count;
    subjects += count;
    totals.draft += Number(row.draft_count ?? 0);
    totals.review += Number(row.review_count ?? 0);
    totals.approved += Number(row.approved_count ?? 0);
    totals.published += Number(row.published_count ?? 0);
  }
  return {
    records: subjects,
    average: subjects ? Math.round(weighted / subjects) : 0,
    ...totals,
  };
}
