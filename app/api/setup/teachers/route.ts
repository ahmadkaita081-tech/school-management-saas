import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { withAuth } from "@/lib/auth/api-guard";
import { requestClientOrNull } from "@/lib/supabase/request-client";

export const POST = withAuth("teachers.manage", async (request: NextRequest) => {
    try {
        const { teachers } = await request.json();

        if (!Array.isArray(teachers) || teachers.length === 0) {
            return NextResponse.json({ error: "No teachers provided" }, { status: 400 });
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

        const results = [];

        for (const teacher of teachers) {
            const { email, name, staffNo, classroom } = teacher;

            if (!email) continue;

            let userId: string;

            // 1. Try to send the invitation email
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${request.nextUrl.origin}/auth/update-password`,
            });

            if (authError) {
                // If the user already exists or rate limit was hit, look up the existing user so we don't block setup
                if (authError.message.includes("rate limit") || authError.message.includes("already registered")) {
                    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = existingUsers?.users.find((u) => u.email === email);
                    
                    if (listError || !existingUser) {
                        return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 400 });
                    }
                    userId = existingUser.id;
                } else {
                    return NextResponse.json({ error: authError.message }, { status: 400 });
                }
            } else {
                userId = authData.user.id;
            }

            // 2. Insert/Upsert into the public teachers table using the shared UUID
            const { error: dbError } = await supabase
                .from("teachers")
                .upsert({
                    id: userId,
                    email,
                    name,
                    staff_no: staffNo,
                    classroom,
                });

            if (dbError) {
                return NextResponse.json({ error: dbError.message }, { status: 400 });
            }

            results.push({ email, userId });
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        return apiError("POST /api/setup/teachers", error);
    }
});