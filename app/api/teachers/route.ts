import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { withAuth } from "@/lib/auth/api-guard";
import { requestClientOrNull } from "@/lib/supabase/request-client";
import { listTeachers } from "@/lib/supabase/school-data";

/** Staff directory for the caller's school. */
export const GET = withAuth("teachers.manage", async () => {
  const supabase = await requestClientOrNull();
  if (!supabase) {
    return NextResponse.json({ status: "not_configured", teachers: [], message: "Connect Supabase environment variables to load staff records." });
  }

  try {
    const teachers = await listTeachers(supabase);
    return NextResponse.json({ status: "ok", source: "supabase", teachers });
  } catch (error) {
    return apiError("GET /api/teachers", error);
  }
});
export const POST = withAuth("teachers.manage", async (request: NextRequest) => {
    try {
        const { email, full_name, classroom } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const supabase = await requestClientOrNull();
        if (!supabase) {
            return NextResponse.json({ error: "Database not configured" }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Create auth user and send invite email
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${request.nextUrl.origin}/auth/update-password`,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Insert into the public teachers table using the shared UUID
        const { error: dbError } = await supabase
            .from("teachers")
            .insert({
                id: userId,
                email,
                full_name,
                classroom,
            });

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, userId });
    } catch (error) {
        return apiError("POST /api/teachers", error);
    }
});