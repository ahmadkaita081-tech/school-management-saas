import { requestClientOrNull } from "@/lib/supabase/request-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const studentId = formData.get("studentId")?.toString();

        console.log("--- DELETE API HIT ---");
        console.log("Received studentId:", studentId);

        if (!studentId) {
            return NextResponse.json({ error: "Missing student ID" }, { status: 400 });
        }

        const supabase = await requestClientOrNull();
        if (!supabase) {
            return NextResponse.json({ error: "Database not configured" }, { status: 500 });
        }

      const { data, error } = await supabase.from("students").delete().eq("id", studentId).select();
        console.log("Supabase delete response data:", data);
        console.log("Supabase delete response error:", error);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
        const proto = request.headers.get("x-forwarded-proto") || "http";
        return NextResponse.redirect(new URL(`${proto}://${host}/dashboard/students`), { status: 303 });
    } catch (err: any) {
        console.error("Server error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}