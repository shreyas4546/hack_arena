import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { team_id, reason } = await request.json();

    if (!team_id || !reason) {
      return NextResponse.json({ error: "Missing team_id or reason" }, { status: 400 });
    }

    // Check if team exists and is not already disqualified
    const { data: team, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("id, status, team_name")
      .eq("id", team_id)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.status === "disqualified") {
      return NextResponse.json({ error: "Team is already disqualified" }, { status: 400 });
    }

    // Disqualify the team — only use existing columns
    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({
        status: "disqualified",
        strike_count: 3,
      })
      .eq("id", team_id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: `Team "${team.team_name}" has been disqualified. Reason: ${reason}` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
