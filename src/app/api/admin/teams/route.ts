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
    const url = new URL(request.url);
    const eventParam = url.searchParams.get("event_id");

    let query = supabaseAdmin
      .from("teams")
      .select("id, team_name, repo_url, deployment_url, last_push, status, strike_count, category, problem_statement, deployment_status, response_time, score, judge_score, created_at, event_id, checkpoint_status, last_processed_checkpoint, checkpoints_missed")
      .order("created_at", { ascending: false });

    if (eventParam === "all") {
      // Return all events
    } else if (eventParam) {
      const eid = parseInt(eventParam, 10);
      if (!isNaN(eid)) {
        query = query.eq("event_id", eid);
      }
    } else {
      // Default to active event from settings
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("event_id")
        .eq("id", 1)
        .single();
      const activeEventId = settings?.event_id || 1;
      query = query.eq("event_id", activeEventId);
    }

    let { data: teams, error } = await query;

    if (error && (error.code === '42703' || error.message?.includes('does not exist') || error.code === 'PGRST204')) {
      // Fallback for pre-migration state: query legacy columns and map defaults
      const legacyRes = await supabaseAdmin
        .from("teams")
        .select("id, team_name, repo_url, deployment_url, last_push, status, strike_count, category, problem_statement, deployment_status, response_time, score, judge_score, created_at")
        .order("created_at", { ascending: false });

      if (!legacyRes.error && legacyRes.data) {
        teams = legacyRes.data.map((t: any) => ({
          ...t,
          event_id: 1,
          checkpoint_status: "on_track",
          last_processed_checkpoint: 0,
          checkpoints_missed: 0
        }));
        error = null;
      }
    }

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
