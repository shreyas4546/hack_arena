import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    // Check if Strike system is enabled
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("event_id, feature_strikes_enabled")
      .eq("id", 1)
      .single();

    if (settings?.feature_strikes_enabled === false) {
      return NextResponse.json(
        { error: "Strike system is disabled for this event." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { team_id, action } = body;

    if (!team_id || !action) {
      return NextResponse.json({ error: "Missing team ID or action" }, { status: 400 });
    }

    // Get current strike count and verify event_id
    const { data: team, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("strike_count, event_id")
      .eq("id", team_id)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const activeEventId = settings?.event_id || 1;
    if (team.event_id && team.event_id !== activeEventId) {
      return NextResponse.json({ error: "Cannot modify strikes for a team from a previous event." }, { status: 403 });
    }

    const newCount = action === "add" 
      ? team.strike_count + 1 
      : Math.max(0, team.strike_count - 1);

    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({ strike_count: newCount })
      .eq("id", team_id);

    if (updateError) {
      return NextResponse.json({ error: "Database error updating strikes" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Strikes ${action === "add" ? "increased" : "decreased"} successfully`,
      new_count: newCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
