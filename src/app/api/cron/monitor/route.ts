import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestPushTime } from "@/lib/github";
import { sendDiscordNotification } from "@/lib/discord";
import { calculateTeamScore } from "@/lib/scoring";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { isSafePublicUrl, safePingUrl } from "@/lib/url-validation";

// export const maxDuration = 60; // Max allowed for Vercel Hobby/Pro depending on plan, helps prevent raw timeouts
export const dynamic = "force-dynamic";

// Evaluation Constants
const BATCH_SIZE = 5;
const DEPLOYMENT_TIMEOUT_MS = 4000; // Reduced to 4 seconds to prevent serverless function timeout

async function pingDeployment(url: string | null): Promise<{ status: "live" | "slow" | "down" | "pending"; time: number }> {
  if (!url) return { status: "pending", time: 0 };
  if (!isSafePublicUrl(url)) return { status: "down", time: 0 };

  try {
    const res = await safePingUrl(url, DEPLOYMENT_TIMEOUT_MS);
    if (res.ok) {
      if (res.isRedirect) {
        return { status: res.timeMs < 3000 ? "live" : "slow", time: res.timeMs };
      }
      const text = res.bodySnippet || "";
      if (text.toLowerCase().includes("<html") || text.toLowerCase().includes("<title>")) {
        return { status: res.timeMs < 3000 ? "live" : "slow", time: res.timeMs };
      }
    }
    return { status: "down", time: res.timeMs };
  } catch {
    return { status: "down", time: DEPLOYMENT_TIMEOUT_MS };
  }
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
function safeCompareTokens(provided: string, expected: string): boolean {
  const bufA = Buffer.from(provided, "utf-8");
  const bufB = Buffer.from(expected, "utf-8");

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

async function executeMonitoring() {
  try {
    let trackingFrozen = false;
    let freezeMessage = "";

    // --- GLOBAL TIMER LOCK LOGIC ---
    const { data: settings, error: settingsError } = await supabaseAdmin.from("settings").select("*").single();
    if (!settingsError && settings) {
      const { timer_status, timer_start_time, timer_accumulated_ms, timer_duration_hours } = settings;

      if (timer_status === "stopped" || timer_status === "unset" || timer_status === "paused") {
        trackingFrozen = true;
        freezeMessage = `Hackathon is ${timer_status}. Tracking is locked.`;
      } else if (timer_status === "running") {
        const totalMs = (timer_duration_hours || 24) * 60 * 60 * 1000;
        let elapsedMs = timer_accumulated_ms || 0;
        
        if (timer_start_time) {
          const startTime = new Date(timer_start_time).getTime();
          elapsedMs += Math.max(0, new Date().getTime() - startTime);
        }

        const remainingMs = Math.max(0, totalMs - elapsedMs);

        // Timer automatically expired
        if (remainingMs <= 0) {
          await supabaseAdmin.from("settings").update({ timer_status: "stopped" }).eq("id", 1);
          
          await sendDiscordNotification({
            content: "🚨 **System Alert**\n\nThe timer has reached 00:00:00. The hackathon has formally ended and automated tracking is permanently stopped.",
          });
          
          trackingFrozen = true;
          freezeMessage = "Timer expired. Global lock engaged.";
        }
      }
    }
    // ---------------------------------

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

    if (trackingFrozen) {
      // Just categorize existing teams for the Discord report without doing any API calls or DB updates
      for (const team of teams) {
        if (team.status === "active") report.active.push(team.team_name);
        else if (team.status === "warning") report.warning.push(team.team_name);
        else if (team.status === "inactive") report.inactive.push(team.team_name);
        else if (team.status === "disqualified") report.disqualified.push(team.team_name);

        if (team.deployment_status === "down" && team.deployment_url) report.down.push(team.team_name);
        
        if (team.strike_count >= 3 && team.status !== "disqualified") {
          report.action_required.push(`${team.team_name} (Strikes: ${team.strike_count})`);
        }
      }
    } else {
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
            
            const regTime = new Date(team.created_at).getTime();
            let isValidHackathonPush = false;
            
            // CRITICAL FIX: If GitHub API failed (e.g. rate limit), fallback to the team's last known push time
            const effectiveLastPushDate = lastPushDate || (team.last_push ? new Date(team.last_push) : null);

            if (effectiveLastPushDate && effectiveLastPushDate.getTime() > regTime) {
              isValidHackathonPush = true;
              lastPushTimeStr = effectiveLastPushDate.toISOString();
            }

            // If they haven't made a valid push since registering, the 60-min timer starts from their registration time.
            const referenceTime = isValidHackathonPush ? effectiveLastPushDate!.getTime() : regTime;
            // Math.max(0, ...) strictly prevents negative time differences from clock skew which would cause -1 strikes
            const diffMins = Math.max(0, (now - referenceTime) / (1000 * 60));

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
            
            const finalScore = calculateTeamScore(
              team.judge_score,
              newStrikes,
              deployEval.status,
              lastPushTimeStr,
              team.created_at
            );

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
    }

    if (!trackingFrozen) {
      // Apply strict sequential updates to DB to avoid lock contention
      for (const update of updates) {
        if (!update) continue;
        await supabaseAdmin.from("teams").update(update).eq("id", update.id);
      }
    }

    const formatList = (arr: string[]) => {
      if (arr.length === 0) return "None";
      if (arr.length > 15) return arr.slice(0, 15).join("\n") + `\n...and ${arr.length - 15} more`;
      return arr.join("\n");
    };

    const customMessage = `
${trackingFrozen ? `❄️ **TRACKING FROZEN** (${freezeMessage})\n*Team scores and strikes are currently locked.*\n\n` : ''}**🟢 Active Teams**
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

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // Case A — CRON_SECRET is missing or empty: Fail closed before executing any monitoring logic
  if (!cronSecret || cronSecret.trim() === "") {
    return new Response("Cron secret is not configured.", { status: 503 });
  }

  // Case B — Missing or incorrect authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (!token || !safeCompareTokens(token, cronSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Case C — Correct Bearer token: Execute scheduled monitoring
  return executeMonitoring();
}

export async function POST(request: Request) {
  // Manual trigger from Admin Dashboard: enforce administrator authorization
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  // Authenticated administrator authorized: execute monitoring logic
  return executeMonitoring();
}
