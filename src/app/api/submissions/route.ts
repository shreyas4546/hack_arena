import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { team_name, repo_url, deployment_url } = await request.json();

    if (!team_name || !repo_url || !deployment_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check Settings if Submissions are Locked
    const { data: settings } = await supabaseAdmin.from("settings").select("submissions_locked").single();
    if (settings?.submissions_locked) {
      return NextResponse.json({ error: "Submissions are currently locked." }, { status: 403 });
    }

    // 2. Fetch Team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("*")
      .eq("team_name", team_name)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    if (team.repo_url !== repo_url) {
      return NextResponse.json({ error: "Provided Repository URL does not match registered URL." }, { status: 400 });
    }

    if (team.status === "disqualified") {
      return NextResponse.json({ error: "Team is disqualified and cannot submit." }, { status: 403 });
    }

    // 3. Validate Public GitHub Repo
    const repoRes = await fetch(repo_url);
    if (!repoRes.ok) {
      return NextResponse.json({ error: "Repository is not accessible or not public." }, { status: 400 });
    }

    // 4. Validate Deployment URL (HTTP 200)
    try {
      // Allow overriding user agent as some hosting providers block standard fetch
      const deployRes = await fetch(deployment_url, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HackArena/1.0)'
        }
      });
      if (!deployRes.ok) {
        return NextResponse.json({ error: `Deployment URL returned status ${deployRes.status}. Must be 200 OK.` }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Failed to connect to Deployment URL." }, { status: 400 });
    }

    // 5. Update Team Submission
    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({ deployment_url })
      .eq("id", team.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Submission successful!" });

  } catch (error: any) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
