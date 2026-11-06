import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateTeamScore } from "@/lib/scoring";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    // 1. Check if Scoring system is enabled and get current active event
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("event_id, feature_scoring_enabled, feature_strikes_enabled")
      .eq("id", 1)
      .single();

    if (settings?.feature_scoring_enabled === false) {
      return NextResponse.json(
        { error: "Scoring system is disabled for this event." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { team_id, judge_score } = body;

    if (!team_id) {
      return NextResponse.json({ error: "Missing team ID" }, { status: 400 });
    }

    // Must be a number between 0 and 10
    const scoreNum = Number(judge_score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      return NextResponse.json({ error: "Score must be a number between 0 and 10" }, { status: 400 });
    }

    // Fetch the team's current metrics to instantly calculate the new total score without waiting for cron
    const { data: team, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("strike_count, deployment_status, last_push, created_at, event_id")
      .eq("id", team_id)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const activeEventId = settings?.event_id || 1;
    if (team.event_id && team.event_id !== activeEventId) {
      return NextResponse.json({ error: "Cannot modify score of a team from a previous event." }, { status: 403 });
    }

    const strikesEnabled = settings?.feature_strikes_enabled !== false;

    const newFinalScore = calculateTeamScore(
      scoreNum,
      team.strike_count,
      team.deployment_status,
      team.last_push,
      team.created_at,
      strikesEnabled
    );

    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({ judge_score: scoreNum, score: newFinalScore })
      .eq("id", team_id);

    if (updateError) {
      return NextResponse.json({ error: "Database error updating score" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Judge score saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
