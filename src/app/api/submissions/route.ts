import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { problemStatements } from "@/constants/problemStatements";
import { isSafePublicUrl, safePingUrl } from "@/lib/url-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller using verified Supabase Auth session token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to your team account to submit." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to your team account to submit." },
        { status: 401 }
      );
    }

    // Verify token cryptographically with Supabase Auth (does not use service-role key to authenticate caller)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    const { team_name, repo_url, deployment_url, category, problem_statement } = await request.json();

    if (!team_name || !repo_url || !deployment_url || !category || !problem_statement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Validate Category and Problem Statement against predefined list
    const validCategory = problemStatements[category];
    if (!validCategory || !validCategory.find(p => p.title === problem_statement)) {
      return NextResponse.json({ error: "Invalid Category or Problem Statement selected." }, { status: 400 });
    }

    // 3. Check Settings if Submissions are Locked
    const { data: settings } = await supabaseAdmin.from("settings").select("submissions_locked, event_id").single();
    if (settings?.submissions_locked) {
      return NextResponse.json({ error: "Submissions are currently locked." }, { status: 403 });
    }

    // 4. Fetch Team from database
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("*")
      .eq("team_name", team_name)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const activeEventId = settings?.event_id || 1;
    if (team.event_id && team.event_id !== activeEventId) {
      return NextResponse.json(
        { error: "Submissions are only open for the active hackathon event." },
        { status: 403 }
      );
    }

    // 5. Ownership Verification: caller's verified Supabase user ID must match team's auth_user_id
    if (team.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to submit for this team." },
        { status: 403 }
      );
    }

    if (team.repo_url !== repo_url) {
      return NextResponse.json({ error: "Provided Repository URL does not match registered URL." }, { status: 400 });
    }

    if (team.status === "disqualified") {
      return NextResponse.json({ error: "Team is disqualified and cannot submit." }, { status: 403 });
    }

    // 6. Validate GitHub Repo Format (No network fetch to prevent GitHub blocking)
    try {
      const trimmedUrl = repo_url.trim();
      const githubRegex = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?.*$/i;
      
      if (!githubRegex.test(trimmedUrl)) {
        return NextResponse.json({ error: "Invalid GitHub Repository URL format." }, { status: 400 });
      }
    } catch (e) {
      console.warn("Regex validation failed unexpectedly, skipping:", e);
    }

    // 7. Validate Deployment URL (safe SSRF check, then live ping)
    if (!isSafePublicUrl(deployment_url)) {
      return NextResponse.json(
        { error: "Deployment URL must be a valid public HTTP or HTTPS web address." },
        { status: 400 }
      );
    }

    try {
      const pingResult = await safePingUrl(deployment_url, 5000);
      if (!pingResult.ok && pingResult.status >= 400) {
        return NextResponse.json({ error: `Deployment URL returned status ${pingResult.status}. Must be a live, accessible URL.` }, { status: 400 });
      } else if (!pingResult.ok && pingResult.error) {
        // If it resolved to a private/restricted address during DNS pinning check, reject immediately
        if (pingResult.error.includes("restricted") || pingResult.error.includes("private") || pingResult.error.includes("permitted")) {
          return NextResponse.json({ error: pingResult.error }, { status: 400 });
        }
      }
    } catch (e) {
      // Don't block submission if network check times out or fails on SPAs/firewalls
      console.warn("Deploy URL ping failed during submission, allowing anyway:", (e as Error).message);
    }

    // 8. Update Team Submission using service-role client (executed only after caller identity and ownership are verified)
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
