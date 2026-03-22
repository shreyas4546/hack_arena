import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestPushTime } from "@/lib/github";
import { sendDiscordNotification } from "@/lib/discord";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Authorization Check
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { data: teams, error: fetchError } = await supabaseAdmin
      .from("teams")
      .select("*")
      .neq("status", "disqualified");

    if (fetchError) throw fetchError;
    if (!teams || teams.length === 0) {
      return NextResponse.json({ message: "No active teams to monitor." });
    }

    const updates = [];
    const report = {
      active: [] as string[],
      warning: [] as string[],
      inactive: [] as string[],
      disqualified: [] as string[],
    };

    const now = new Date().getTime();

    for (const team of teams) {
      const lastPushDate = await getLatestPushTime(team.repo_url);
      let newStatus = team.status;
      let newStrikes = team.strike_count;
      let lastPushTimeStr = team.last_push; // keep old if not found temporarily

      if (lastPushDate) {
        lastPushTimeStr = lastPushDate.toISOString();
        const diffMins = (now - lastPushDate.getTime()) / (1000 * 60);

        if (diffMins <= 60) {
          newStatus = "active";
          // keep strikes as is (they don't reset unless admin resets)
        } else if (diffMins > 60 && diffMins <= 120) {
          newStatus = "warning";
          newStrikes += 1;
        } else if (diffMins > 120) {
          newStatus = "inactive";
          newStrikes += 1;
        }

        // Basic deduplication to avoid double counting strikes if pushing same empty commit,
        // but since we check time delta, if time delta is old, we add strikes.
        // Wait, if cron runs HOURLY, diffMins will keep growing: next hour it's >120, next hour >180
        // So they keep getting strikes every hour if they don't push!
        if (newStrikes >= 3) {
          newStatus = "disqualified";
        }
      }

      // Add to tracking
      updates.push({
        id: team.id,
        status: newStatus,
        strike_count: newStrikes,
        last_push: lastPushTimeStr,
      });

      // Report grouping
      report[newStatus as keyof typeof report].push(team.team_name);
    }

    // Apply exact updates to DB
    for (const update of updates) {
      // Use single updates since array upsert needs all fields or matches PK correctly depending on Supabase setup
      await supabaseAdmin.from("teams").update({
        status: update.status,
        strike_count: update.strike_count,
        last_push: update.last_push,
      }).eq("id", update.id);
    }

    // Send Discord notification
    await sendDiscordNotification({
      content: "🔔 **Hourly Hackathon Activity Report**",
      embeds: [
        {
          color: 0x5865f2,
          fields: [
            { name: "🟢 Active Teams", value: report.active.length > 0 ? report.active.join(", ") : "None", inline: false },
            { name: "🟡 Warning (Strike added)", value: report.warning.length > 0 ? report.warning.join(", ") : "None", inline: false },
            { name: "🔴 Inactive (Strike added)", value: report.inactive.length > 0 ? report.inactive.join(", ") : "None", inline: false },
            { name: "💀 Disqualified", value: report.disqualified.length > 0 ? report.disqualified.join(", ") : "None", inline: false },
          ],
        },
      ],
    });

    return NextResponse.json({ success: true, updates });
  } catch (error: any) {
    console.error("Cron Monitor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
