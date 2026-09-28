import { requestClientOrNull } from "@/lib/supabase/request-client";
import { withAuth } from "@/lib/auth/api-guard";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { createLiveStudentsBulk } from "@/lib/supabase/school-data";
import { invalidInputResponse, studentsBulkSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitedResponse, rateLimitKey } from "@/lib/rate-limit";

export const POST = withAuth("students.manage", async (request: NextRequest, context: any) => {
    const throttle = checkRateLimit(rateLimitKey(request, "setup-students"), { limit: 30, windowMs: 60000 });
    if (!throttle.allowed) return rateLimitedResponse(throttle.retryAfterMs);
    
    const supabase = await requestClientOrNull();
    if (!supabase) return NextResponse.json({ status: "not_configured", message: "Connect Supabase" });

    const parsed = studentsBulkSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return invalidInputResponse(parsed);

    try {
        const orgId = context?.organizationId;
        if (!orgId) {
            return NextResponse.json({ status: "error", message: "Organization context missing." }, { status: 400 });
        }

        // 1. Fetch organization subscription and student limit details
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("max_students, subscription_expires_at")
            .eq("id", orgId)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ status: "error", message: "Organization not found." }, { status: 404 });
        }

        // 2. Enforce 1-Year Access Expiration Rule
        if (org.subscription_expires_at && new Date() > new Date(org.subscription_expires_at)) {
            return NextResponse.json({ 
                status: "expired", 
                message: "Your 1-year school subscription has expired. Please contact support to renew your access." 
            }, { status: 403 });
        }

        // 3. Enforce Student Count Limit Rule
        const { count: currentCount, error: countError } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId);

        if (countError) throw countError;

        const incomingCount = parsed.data.students.length;
        const maxAllowed = org.max_students ?? 0;

        if ((currentCount || 0) + incomingCount > maxAllowed) {
            return NextResponse.json({ 
                status: "limit_exceeded", 
                message: `Student limit reached. Your plan allows up to ${maxAllowed} students, but this addition would bring you to ${(currentCount || 0) + incomingCount}.` 
            }, { status: 403 });
        }

        // 4. Proceed with insertion if checks pass
        const result = await createLiveStudentsBulk(supabase, parsed.data.students, { email: context?.userEmail });
        return NextResponse.json({ status: "saved", data: result.students, linked: result.linked });
    } catch (error) {
        return apiError("POST /api/setup/students", error);
    }
});