import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
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

    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({ judge_score: scoreNum })
      .eq("id", team_id);

    if (updateError) {
      return NextResponse.json({ error: "Database error updating score" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Judge score saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
