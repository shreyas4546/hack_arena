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
    const { team_name, repo_url, category, problem_statement } = await request.json();

    if (!team_name || !repo_url) {
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

    const { data, error } = await supabase
      .from("teams")
      .insert([{ team_name, repo_url, status: "active", strike_count: 0, last_push: null }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
