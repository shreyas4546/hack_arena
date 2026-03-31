import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PROBLEMS = {
  "FinTech": [
    "Subscription Tracker & Auto-Cancel System",
    "Multi-Bank Dashboard Web App"
  ],
  "EdTech": [
    "Collaborative Study Rooms (Virtual)",
    "Online Coding Assessment Platform"
  ],
  "Healthcare": [
    "Digital Health Record Portal",
    "Doctor Availability & Teleconsultation Platform"
  ],
  "Social Impact": [
    "Community Issue Reporting System",
    "Local Farmer-to-Consumer Marketplace"
  ],
  "Campus Solutions": [
    "Placement Preparation Portal",
    "Unified Campus Portal"
  ]
};

export async function POST(request: Request) {
  try {
    const { team_name, repo_url, deployment_url, category, problem_statement } = await request.json();

    if (!team_name || !repo_url || !deployment_url || !category || !problem_statement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 0. Validate Category and Problem Statement against predefined list
    const validProblems = (PROBLEMS as any)[category];
    if (!validProblems || !validProblems.includes(problem_statement)) {
      return NextResponse.json({ error: "Invalid Category or Problem Statement selected." }, { status: 400 });
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

    // 3. Validate GitHub Repo Format (No network fetch to prevent GitHub blocking)
    try {
      const trimmedUrl = repo_url.trim();
      const githubRegex = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?.*$/i;
      
      if (!githubRegex.test(trimmedUrl)) {
        return NextResponse.json({ error: "Invalid GitHub Repository URL format." }, { status: 400 });
      }
    } catch (e) {
      console.warn("Regex validation failed unexpectedly, skipping:", e);
    }

    // 4. Validate Deployment URL (lenient - accept redirects, don't block on fetch failure)
    try {
      const deployRes = await fetch(deployment_url, { 
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; HackArena/1.0)'
        }
      });
      if (deployRes.status >= 400) {
        return NextResponse.json({ error: `Deployment URL returned status ${deployRes.status}. Must be a live, accessible URL.` }, { status: 400 });
      }
    } catch (e) {
      // Don't block submission if fetch fails — CORS, firewalls, or SPAs may cause this.
      // The cron monitor will verify deployment health periodically.
      console.warn("Deploy URL fetch failed during submission, allowing anyway:", (e as Error).message);
    }

    // 5. Update Team Submission
    const { error: updateError } = await supabaseAdmin
      .from("teams")
      .update({ deployment_url, category, problem_statement })
      .eq("id", team.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Submission successful!" });

  } catch (error: any) {
    console.error("Submission Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
