import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestPushTime } from "@/lib/github";
import { sendDiscordNotification } from "@/lib/discord";

// export const maxDuration = 60; // Max allowed for Vercel Hobby/Pro depending on plan, helps prevent raw timeouts
export const dynamic = "force-dynamic";

// Evaluation Constants
const BATCH_SIZE = 5;
const DEPLOYMENT_TIMEOUT_MS = 4000; // Reduced to 4 seconds to prevent serverless function timeout

async function pingDeployment(url: string | null): Promise<{ status: "live" | "slow" | "down" | "pending"; time: number }> {
  if (!url) return { status: "pending", time: 0 };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEPLOYMENT_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "HackArena-Eval/1.0" },
      signal: controller.signal,
    });
    
    // Some platforms return 200 but it's an error page. We just check basic validity.
    const time = Date.now() - start;
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      // Basic check: must contain HTML and something roughly looking like a valid response format (like a `<title>`)
      if (text.toLowerCase().includes("<html") || text.toLowerCase().includes("<title>")) {
        return { status: time < 3000 ? "live" : "slow", time };
      }
    }
    return { status: "down", time };
  } catch (error) {
    clearTimeout(timeoutId);
    return { status: "down", time: Date.now() - start };
  }
}

export async function GET(request: Request) {
  // Authorization Check - CRON_SECRET Enforcement
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { data: teams, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("*");

    if (fetchError) throw fetchError;
    if (!teams || teams.length === 0) {
      return NextResponse.json({ message: "No teams to monitor." });
    }

    const updates = [];
    const report = {
      active: [] as string[],
      warning: [] as string[],
      inactive: [] as string[],
      disqualified: [] as string[],
      down: [] as string[],
      action_required: [] as string[],
    };

    const now = new Date().getTime();

    // Process in Controlled Batches
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (team) => {
          // Short-circuit: Disqualified teams are just reported, never evaluated/pinged again.
          if (team.status === "disqualified") {
            report.disqualified.push(team.team_name);
            return null;
          }

          // 1. GitHub Evaluation
          let lastPushDate = await getLatestPushTime(team.repo_url);
          
          let newStatus = team.status;
          let newStrikes = team.strike_count;
          let lastPushTimeStr = team.last_push; 
          let activityScore = 0;

          const regTime = new Date(team.created_at).getTime();
          let isValidHackathonPush = false;

          if (lastPushDate && lastPushDate.getTime() > regTime) {
            isValidHackathonPush = true;
            lastPushTimeStr = lastPushDate.toISOString();
          }

          // If they haven't made a valid push since registering, the 60-min timer starts from their registration time.
          const referenceTime = isValidHackathonPush ? lastPushDate!.getTime() : regTime;
          // Math.max(0, ...) strictly prevents negative time differences from clock skew which would cause -1 strikes
          const diffMins = Math.max(0, (now - referenceTime) / (1000 * 60));

          // Calculate base activity component (0-100 scale, declines linearly up to 24h)
          activityScore = Math.max(0, 100 - (diffMins / (24 * 60)) * 100);

          // Stateless Strike Calculation: 1 strike for every full 60 mins missed
          newStrikes = Math.floor(diffMins / 60);

          if (newStrikes === 0) {
            newStatus = "active";
          } else if (newStrikes <= 2) {
            newStatus = "warning";
          } else {
            newStatus = "inactive";
          }

          // 2. Deployment Evaluation (with retry logic)
          let deployEval = await pingDeployment(team.deployment_url);
          if (deployEval.status === "down" && team.deployment_url) {
            // Give it one immediate retry if it failed (cold start anomaly)
            deployEval = await pingDeployment(team.deployment_url);
          }
          
          let deploymentScore = 0;
          if (deployEval.status === "live") deploymentScore = 100;
          else if (deployEval.status === "slow") deploymentScore = 50;

          // 3. Stability Component
          let stabilityScore = 0;
          if (newStrikes === 0) stabilityScore = 100;
          else if (newStrikes === 1) stabilityScore = 50;
          else if (newStrikes === 2) stabilityScore = 20;

          // 4. Final Score Calculation (Hybrid: Behavioral Analytics + Human Judging)
          const behaviorScore = (activityScore * 0.4) + (deploymentScore * 0.4) + (stabilityScore * 0.2); // 0-100
          
          let finalRawScore = 0;
          if (team.judge_score && team.judge_score > 0) {
            // Weighted: 40% Behavior, 60% Judge (normalized to 100)
            const judgeContrib = team.judge_score * 10;
            finalRawScore = (behaviorScore * 0.4) + (judgeContrib * 0.6);
          } else {
            // Baseline: 100% Behavior if judging hasn't happened yet
            finalRawScore = behaviorScore;
          }

          const finalScore = Math.round((finalRawScore / 10) * 10) / 10; // 0-10 with 1 decimal

          // Populating report with all evaluated active/warning/inactive teams
          if (newStatus === "active") report.active.push(team.team_name);
          else if (newStatus === "warning") report.warning.push(team.team_name);
          else if (newStatus === "inactive") report.inactive.push(team.team_name);
          else if (newStatus === "disqualified") report.disqualified.push(team.team_name); // newly disqualified this run

          if (deployEval.status === "down" && team.deployment_url) report.down.push(team.team_name);

          // Flag teams with 3+ strikes for manual admin disqualification
          if (newStrikes >= 3 && newStatus !== "disqualified") {
            report.action_required.push(`${team.team_name} (Strikes: ${newStrikes})`);
          }

          return {
            id: team.id,
            status: newStatus,
            strike_count: newStrikes,
            last_push: lastPushTimeStr,
            deployment_status: deployEval.status,
            response_time: deployEval.time,
            score: finalScore
          };
        })
      );
      
      // Filter out nulls (disqualified teams that were skipped)
      updates.push(...batchResults.filter(Boolean));
    }

    // Apply strict sequential updates to DB to avoid lock contention
    for (const update of updates) {
      if (!update) continue;
      await supabaseAdmin.from("teams").update(update).eq("id", update.id);
    }

    const formatList = (arr: string[]) => {
      if (arr.length === 0) return "None";
      if (arr.length > 15) return arr.slice(0, 15).join("\n") + `\n...and ${arr.length - 15} more`;
      return arr.join("\n");
    };

    const customMessage = `
**🟢 Active Teams**
${formatList(report.active)}

**🟡 Warning**
${formatList(report.warning)}

**🔴 Inactive**
${formatList(report.inactive)}

**💀 Disqualified**
${formatList(report.disqualified)}

${report.action_required.length > 0 ? `\n🚨 **ADMIN ACTION REQUIRED (Recommend Disqualification)**\n${formatList(report.action_required)}\n` : ''}`.trim();

    // Discord Report
    await sendDiscordNotification({
      content: "📊 **Hackathon Status Report**\n\n" + customMessage,
    });

    return NextResponse.json({ success: true, processed: updates.length, updates });
  } catch (error: any) {
    console.error("Cron Monitor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Middleware protects POST /api/cron/monitor with Basic Auth
  // We mock the CRON_SECRET header so the GET handler allows it
  const mockReq = new Request(request.url, {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  return GET(mockReq);
}
