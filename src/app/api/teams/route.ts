import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch current event settings to check active event_id and feature masks
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("event_id, feature_scoring_enabled, feature_strikes_enabled")
      .eq("id", 1)
      .single();

    const activeEventId = settings?.event_id || 1;
    const isScoringEnabled = settings?.feature_scoring_enabled !== false;
    const isStrikesEnabled = settings?.feature_strikes_enabled !== false;

    // 2. Fetch public teams view
    let query = supabase
      .from("teams_public")
      .select("id, team_name, repo_url, deployment_url, last_push, status, strike_count, category, problem_statement, deployment_status, response_time, score, created_at")
      .order("created_at", { ascending: false });

    // Filter by active event_id if present
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Apply server-side sanitization: when a feature is OFF, omit its public exposure
    const sanitized = (data || []).map((team: any) => {
      const item = { ...team };
      if (!isScoringEnabled) {
        item.score = null;
      }
      if (!isStrikesEnabled) {
        item.strike_count = null;
      }
      return item;
    });

    return NextResponse.json(sanitized);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { team_name, repo_url, email, password, domain, prob_statement, team_leader_name, participant_names } = await request.json();

    if (!team_name || !repo_url || !email || !password || !domain || !prob_statement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if registration is locked and get current event_id
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("registration_locked, event_id")
      .eq("id", 1)
      .single();

    if (settings?.registration_locked) {
      return NextResponse.json({ error: "Registration is currently closed by the admin." }, { status: 403 });
    }

    const currentEventId = settings?.event_id || 1;

    // Validate GitHub Repo Format
    if (!repo_url.startsWith("https://github.com/")) {
      return NextResponse.json({ error: "Invalid GitHub repository URL format" }, { status: 400 });
    }

    // Check if team name already exists in the current event
    const { data: existingByName } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("team_name", team_name)
      .eq("event_id", currentEventId)
      .maybeSingle();

    if (existingByName) {
      return NextResponse.json({ 
        error: `Team name "${team_name}" is already taken in this hackathon. Please choose another name.` 
      }, { status: 400 });
    }

    // Check if repo URL already exists in the current event
    const { data: existingByRepo } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("repo_url", repo_url)
      .eq("event_id", currentEventId)
      .maybeSingle();

    if (existingByRepo) {
      return NextResponse.json({ 
        error: "This GitHub repository is already registered by another team in this hackathon." 
      }, { status: 400 });
    }

    // 1. Manage Supabase Auth User (handles new users and returning participants across events)
    let authUserId: string | null = null;
    let newlyCreatedUser = false;

    // Check if user already exists in auth
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (existingUser) {
      // Check if this user is already registered for the current event
      const { data: userCurrentTeam } = await supabaseAdmin
        .from("teams")
        .select("id, team_name")
        .eq("auth_user_id", existingUser.id)
        .eq("event_id", currentEventId)
        .maybeSingle();

      if (userCurrentTeam) {
        return NextResponse.json({ 
          error: `An account with ${email} is already registered as team "${userCurrentTeam.team_name}" for this hackathon. Please log in directly to your dashboard.` 
        }, { status: 400 });
      }

      // Existing participant from previous event or unlinked auth record: update password and team_name metadata
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: { team_name }
        }
      );

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message || "Failed to update participant credentials" }, { status: 400 });
      }

      authUserId = existingUser.id;
    } else {
      // Create fresh auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { team_name }
      });

      if (authError || !authData.user) {
        return NextResponse.json({ error: authError?.message || "Failed to create authentication user" }, { status: 400 });
      }

      authUserId = authData.user.id;
      newlyCreatedUser = true;
    }

    // 2. Insert into teams table with auth_user_id and event_id
    const { data, error } = await supabaseAdmin
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
        auth_user_id: authUserId,
        event_id: currentEventId,
        last_processed_checkpoint: 0,
        checkpoint_status: "on_track",
        checkpoints_missed: 0
      }])
      .select()
      .single();

    if (error) {
      if (newlyCreatedUser && authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
