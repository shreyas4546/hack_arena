import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { team_id, new_password } = await request.json();

    if (!team_id || !new_password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // 1. Get the auth_user_id from the team_id
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("auth_user_id, team_name")
      .eq("id", team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!team.auth_user_id) {
      return NextResponse.json({ error: "No authentication profile linked to this team" }, { status: 400 });
    }

    // 2. Update the password forcefully using Admin SDK
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      team.auth_user_id,
      { password: new_password }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
