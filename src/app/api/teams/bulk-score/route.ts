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
    // Check if Scoring system is enabled and get current event
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
    const { updates } = body; // Array of { team_id, judge_score }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Missing or invalid updates array" }, { status: 400 });
    }

    const activeEventId = settings?.event_id || 1;
    const strikesEnabled = settings?.feature_strikes_enabled !== false;

    // Process each update
    const results = await Promise.all(
      updates.map(async (u) => {
        const { data: team, error: fetchError } = await supabaseAdmin
          .from("teams")
          .select("strike_count, deployment_status, last_push, created_at, event_id")
          .eq("id", u.team_id)
          .single();

        if (fetchError || !team) {
          return { error: fetchError || new Error("Team not found") };
        }

        if (team.event_id && team.event_id !== activeEventId) {
          return { error: new Error(`Cannot modify score for team from past event (Event #${team.event_id})`) };
        }

        const newFinalScore = calculateTeamScore(
          Number(u.judge_score),
          team.strike_count,
          team.deployment_status,
          team.last_push,
          team.created_at,
          strikesEnabled
        );

        return supabaseAdmin
          .from("teams")
          .update({ judge_score: Number(u.judge_score), score: newFinalScore })
          .eq("id", u.team_id);
      })
    );

    const firstError = results.find(r => r.error);
    if (firstError) {
      throw firstError.error;
    }

    return NextResponse.json({ success: true, message: `Updated ${updates.length} scores successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
