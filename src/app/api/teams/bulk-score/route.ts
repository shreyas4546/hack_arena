import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateTeamScore } from "@/lib/scoring";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { team_id, judge_score }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Missing or invalid updates array" }, { status: 400 });
    }

    // Process each update
    // Note: We use a loop here for simplicity with Supabase single updates, 
    // but in a high-concurrency environment, a RPC or single query would be better.
    const results = await Promise.all(
      updates.map(async (u) => {
        const { data: team, error: fetchError } = await supabaseAdmin
          .from("teams")
          .select("strike_count, deployment_status, last_push, created_at")
          .eq("id", u.team_id)
          .single();

        if (fetchError || !team) {
          return { error: fetchError || new Error("Team not found") };
        }

        const newFinalScore = calculateTeamScore(
          Number(u.judge_score),
          team.strike_count,
          team.deployment_status,
          team.last_push,
          team.created_at
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
