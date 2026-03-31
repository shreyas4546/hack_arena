import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { team_id, action } = body;

    if (!team_id || !action) {
      return NextResponse.json({ error: "Missing team ID or action" }, { status: 400 });
    }

    // Get current strike count
    const { data: team, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("strike_count")
      .eq("id", team_id)
      .single();

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
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
