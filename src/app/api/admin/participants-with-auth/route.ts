import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Fetch all teams
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 3. Map emails to team data
    const enhancedTeams = teams.map((team: any) => {
      const authUser = authData.users.find(u => u.id === team.auth_user_id);
      return {
        ...team,
        email: authUser?.email || "Unknown",
      };
    });

    return NextResponse.json(enhancedTeams);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
