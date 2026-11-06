import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { team_id, reason } = await request.json();

    if (!team_id || !reason) {
      return NextResponse.json({ error: "Missing team_id or reason" }, { status: 400 });
    }

    // Check if team exists and is not already disqualified
    const { data: team, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("id, status, team_name, event_id")
      .eq("id", team_id)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.status === "disqualified") {
      return NextResponse.json({ error: "Team is already disqualified" }, { status: 400 });
    }

    // Check settings for event isolation and strike rules
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("event_id, feature_strikes_enabled")
      .eq("id", 1)
      .single();

    const activeEventId = settings?.event_id || 1;
    if (team.event_id && team.event_id !== activeEventId) {
      return NextResponse.json({ error: "Cannot disqualify a team from a previous event." }, { status: 403 });
    }

    const strikesEnabled = settings?.feature_strikes_enabled !== false;

    const updatePayload: any = { status: "disqualified" };
    if (strikesEnabled) {
      updatePayload.strike_count = 3;
    }

    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update(updatePayload)
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
