import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const { team_name, repo_url, email, password, domain, prob_statement, team_leader_name, participant_names } = await request.json();

    if (!team_name || !repo_url || !email || !password || !domain || !prob_statement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if registration is locked
    const { data: settings } = await supabaseAdmin.from("settings").select("registration_locked").single();
    if (settings?.registration_locked) {
      return NextResponse.json({ error: "Registration is currently closed by the admin." }, { status: 403 });
    }

    // Validate GitHub Repo Format
    if (!repo_url.startsWith("https://github.com/")) {
      return NextResponse.json({ error: "Invalid GitHub repository URL format" }, { status: 400 });
    }

    // Check if team name already exists
    const { data: existingByName } = await supabase
      .from("teams")
      .select("id")
      .eq("team_name", team_name)
      .maybeSingle();

    // Check if repo URL already exists
    const { data: existingByRepo } = await supabase
      .from("teams")
      .select("id")
      .eq("repo_url", repo_url)
      .maybeSingle();

    if (existingByName || existingByRepo) {
      return NextResponse.json({ error: "Team name or repository already registered" }, { status: 400 });
    }

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { team_name }
    });

    if (authError || !authData.user) {
      // Return a 400 if user exists or password is too weak
      return NextResponse.json({ error: authError?.message || "Failed to create authentication user" }, { status: 400 });
    }

    // 2. Insert into teams table with auth_user_id
    const { data, error } = await supabase
      .from("teams")
      .insert([{ 
        team_name, 
        repo_url, 
        category: domain,
        problem_statement: prob_statement,
        team_leader_name: team_leader_name || null,
        participant_names: participant_names || [],
        status: "active", 
        strike_count: 0, 
        last_push: null,
        auth_user_id: authData.user.id
      }])
      .select()
      .single();

    if (error) {
      // If team insert fails, we should ideally delete the auth user to prevent orphans, 
      // but keeping it simple as per instructions (minimum interference).
      // Attempt cleanup
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
