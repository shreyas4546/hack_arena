import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestPushTime } from "@/lib/github";
import { sendDiscordNotification } from "@/lib/discord";
import { calculateTeamScore } from "@/lib/scoring";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { isSafePublicUrl, safePingUrl } from "@/lib/url-validation";

export const dynamic = "force-dynamic";

// Evaluation Constants
const BATCH_SIZE = 5;
const DEPLOYMENT_TIMEOUT_MS = 4000; // 4 seconds to prevent serverless function timeout

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

    // Active Feature & Mode Evaluation
    const isLegacyMode = !settings?.feature_config_initialized;
    const isCheckpointsEnabled = settings?.feature_checkpoints_enabled !== false;
    const isStrikesEnabled = settings?.feature_strikes_enabled !== false;
    const isScoringEnabled = settings?.feature_scoring_enabled !== false;
    const commitIntervalHours = settings?.commit_interval_hours || 6;
    const activeEventId = settings?.event_id || 1;

    // Fetch teams: In new mode, isolate to current active event_id; in legacy mode, monitor current teams
    let teamsQuery = supabaseAdmin.from("teams").select("*");
    if (!isLegacyMode) {
      teamsQuery = teamsQuery.eq("event_id", activeEventId);
    }

    const { data: teams, error: fetchError } = await teamsQuery;

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
      // Categorize teams for status report without writing DB mutations
      for (const team of teams) {
        if (team.status === "active") report.active.push(team.team_name);
        else if (team.status === "warning") report.warning.push(team.team_name);
        else if (team.status === "inactive") report.inactive.push(team.team_name);
        else if (team.status === "disqualified") report.disqualified.push(team.team_name);

        if (team.deployment_status === "down" && team.deployment_url) report.down.push(team.team_name);
        
        if (isStrikesEnabled && team.strike_count >= 3 && team.status !== "disqualified") {
          report.action_required.push(`${team.team_name} (Strikes: ${team.strike_count})`);
        }
      }
    } else {
      // Process in Controlled Batches
      for (let i = 0; i < teams.length; i += BATCH_SIZE) {
        const batch = teams.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (team) => {
            if (team.status === "disqualified") {
              report.disqualified.push(team.team_name);
              return null;
            }

            // 1. GitHub Push Fetch (Fault-tolerant)
            let lastPushDate: Date | null = null;
            let githubApiSuccess = true;
            try {
              lastPushDate = await getLatestPushTime(team.repo_url);
            } catch (err) {
              githubApiSuccess = false;
            }

            let lastPushTimeStr = team.last_push;
            const regTime = new Date(team.created_at).getTime();

            // Fallback to team's last known push if GitHub call failed or returned null
            const effectiveLastPushDate = lastPushDate || (team.last_push ? new Date(team.last_push) : null);
            if (effectiveLastPushDate && effectiveLastPushDate.getTime() > regTime) {
              lastPushTimeStr = effectiveLastPushDate.toISOString();
            }

            let newStatus = team.status;
            let newStrikes = team.strike_count;
            let newCheckpointStatus = team.checkpoint_status || "on_track";
            let newCheckpointsMissed = team.checkpoints_missed || 0;
            let lastProcessedCheckpoint = team.last_processed_checkpoint || 0;

            // 2. Mode Evaluation
            if (isLegacyMode) {
              // =======================================================
              // LEGACY MODE: Exact 60-Minute Monitoring for Active Event
              // =======================================================
              const referenceTime = (effectiveLastPushDate && effectiveLastPushDate.getTime() > regTime) 
                ? effectiveLastPushDate.getTime() 
                : regTime;
              const diffMins = Math.max(0, (now - referenceTime) / (1000 * 60));

              // Stateless 60-minute interval strike calculation
              newStrikes = Math.floor(diffMins / 60);

              if (newStrikes === 0) {
                newStatus = "active";
              } else if (newStrikes <= 2) {
                newStatus = "warning";
              } else {
                newStatus = "inactive";
              }
            } else {
              // =======================================================
              // NEW EVENT MODE: Configurable Checkpoint & Feature Controls
              // =======================================================
              if (isCheckpointsEnabled && settings?.timer_start_time) {
                const eventStartTime = new Date(settings.timer_start_time).getTime();
                const elapsedMs = (settings.timer_accumulated_ms || 0) + Math.max(0, now - eventStartTime);
                const intervalMs = commitIntervalHours * 60 * 60 * 1000;
                const completedCheckpointIndex = Math.floor(elapsedMs / intervalMs);

                // Check if a new checkpoint window has closed that hasn't been evaluated yet
                if (completedCheckpointIndex >= 1 && lastProcessedCheckpoint < completedCheckpointIndex) {
                  const checkpointWindowStart = eventStartTime + (completedCheckpointIndex - 1) * intervalMs;
                  const checkpointWindowEnd = eventStartTime + completedCheckpointIndex * intervalMs;

                  // Never issue automatic strikes on GitHub API failure
                  if (githubApiSuccess) {
                    const pushTimeMs = effectiveLastPushDate ? effectiveLastPushDate.getTime() : 0;
                    const madePushInWindow = pushTimeMs >= checkpointWindowStart && pushTimeMs <= checkpointWindowEnd;
                    const reportedStatus = madePushInWindow ? "on_track" : "missed";

                    // Atomic Database Execution via PostgreSQL RPC:
                    // Records checkpoint_logs, enforces strike rules, updates team checkpoint state in a single transaction
                    try {
                      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("process_team_checkpoint", {
                        p_team_id: team.id,
                        p_event_id: activeEventId,
                        p_checkpoint_number: completedCheckpointIndex,
                        p_checkpoint_status: reportedStatus
                      });

                      if (rpcRes?.already_processed) {
                        // Concurrently or previously processed: revert optimistic in-memory strike
                        newStrikes = team.strike_count;
                      } else if (rpcRes?.new_strike_count !== undefined) {
                        newStrikes = rpcRes.new_strike_count;
                        newCheckpointStatus = rpcRes.checkpoint_status || reportedStatus;
                        newCheckpointsMissed = rpcRes.checkpoints_missed ?? newCheckpointsMissed;
                        if (rpcRes?.new_status) {
                          newStatus = rpcRes.new_status;
                        }
                      }
                    } catch (e) {
                      // Fallback for pre-migration state
                      if (madePushInWindow) {
                        newCheckpointStatus = "on_track";
                      } else {
                        newCheckpointsMissed += 1;
                        if (newCheckpointsMissed === 1) {
                          newCheckpointStatus = "warning";
                        } else {
                          newCheckpointStatus = "missed";
                          if (isStrikesEnabled) {
                            newStrikes = team.strike_count + 1;
                          }
                        }
                      }
                    }
                  }

                  // Advance checkpoint index so subsequent cron runs in the same interval NEVER duplicate strikes
                  lastProcessedCheckpoint = completedCheckpointIndex;
                }
              }

              // In new mode, team status is never overwritten by checkpoint status.
              // Keep checkpoint_status separate. Status reflects team operational state.
              if (team.status !== "disqualified") {
                if (isStrikesEnabled && newStrikes >= 3) {
                  newStatus = "inactive";
                } else {
                  newStatus = team.status === "inactive" ? "active" : team.status;
                }
              }
            }

            // 3. Deployment Evaluation (Always executes, even if checkpoints are OFF)
            let deployEval = await pingDeployment(team.deployment_url);
            if (deployEval.status === "down" && team.deployment_url) {
              deployEval = await pingDeployment(team.deployment_url);
            }

            // 4. Score Calculation (Strictly skipped if Scoring is OFF)
            let finalScore = team.score;
            if (isScoringEnabled) {
              finalScore = calculateTeamScore(
                team.judge_score,
                newStrikes,
                deployEval.status,
                lastPushTimeStr,
                team.created_at,
                isStrikesEnabled
              );
            }

            // Report population
            if (newStatus === "active") report.active.push(team.team_name);
            else if (newStatus === "warning") report.warning.push(team.team_name);
            else if (newStatus === "inactive") report.inactive.push(team.team_name);
            else if (newStatus === "disqualified") report.disqualified.push(team.team_name);

            if (deployEval.status === "down" && team.deployment_url) report.down.push(team.team_name);

            if (isStrikesEnabled && newStrikes >= 3 && newStatus !== "disqualified") {
              report.action_required.push(`${team.team_name} (Strikes: ${newStrikes})`);
            }

            // 5. Build safe update payload
            const updatePayload: any = {
              id: team.id,
              status: newStatus,
              last_push: lastPushTimeStr,
              deployment_status: deployEval.status,
              response_time: deployEval.time
            };

            if (isLegacyMode || isStrikesEnabled) {
              updatePayload.strike_count = newStrikes;
            }

            if (!isLegacyMode) {
              updatePayload.checkpoint_status = newCheckpointStatus;
              updatePayload.checkpoints_missed = newCheckpointsMissed;
              updatePayload.last_processed_checkpoint = lastProcessedCheckpoint;
            }

            if (isScoringEnabled) {
              updatePayload.score = finalScore;
            }

            return updatePayload;
          })
        );
        
        updates.push(...batchResults.filter(Boolean));
      }
    }

    if (!trackingFrozen) {
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

    await sendDiscordNotification({
      content: "📊 **Hackathon Status Report**\n\n" + customMessage,
    });

    return NextResponse.json({
      success: true,
      mode: isLegacyMode ? "legacy_60m" : "configurable_checkpoints",
      teams_monitored: teams.length,
      updates_applied: updates.length,
      tracking_frozen: trackingFrozen,
      report,
    });
  } catch (error: any) {
    console.error("Cron monitor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (safeCompareTokens(token, cronSecret.trim())) {
      return executeMonitoring();
    }
  }

  const adminAuth = verifyAdminAuth(request);
  if (adminAuth.authorized) {
    return executeMonitoring();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  return POST(request);
}
