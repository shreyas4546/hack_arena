import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select("id, team_name, repo_url, deployment_url, last_push, status, strike_count, category, problem_statement, deployment_status, response_time, score, judge_score, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(teams);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
