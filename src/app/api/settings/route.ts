import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendDiscordNotification } from "@/lib/discord";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_INTERVALS = [3, 4, 6, 8, 12];

export async function GET() {
  const { data, error } = await supabaseAdmin.from("settings").select("*").single();
  if (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ensure consistent, non-misleading default values across pre-migration, legacy mode, and UI
  const normalized = {
    ...data,
    feature_checkpoints_enabled: data?.feature_checkpoints_enabled ?? true,
    feature_strikes_enabled: data?.feature_strikes_enabled ?? true,
    feature_scoring_enabled: data?.feature_scoring_enabled ?? true,
    commit_interval_hours: data?.commit_interval_hours ?? 6,
    feature_config_initialized: data?.feature_config_initialized ?? false,
    configuration_locked: data?.configuration_locked ?? (data?.timer_status === "running" || data?.timer_status === "paused"),
    event_id: data?.event_id ?? 1
  };

  return NextResponse.json(normalized);
}

export async function POST(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();

    // Fetch current settings for lifecycle and lock evaluation
    const { data: currentSettings, error: fetchErr } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      throw fetchErr;
    }

    // 1. Handle Intentional Event Reset for New Hackathon
    if (body.action === "reset_event") {
      if (!body.confirm_new_hackathon) {
        return NextResponse.json(
          { error: "Explicit confirmation required to reset event and configure a new hackathon." },
          { status: 400 }
        );
      }

      const nextEventId = ((currentSettings?.event_id || 1) + 1);
      const resetPayload = {
        timer_status: "unset",
        timer_start_time: null,
        timer_accumulated_ms: 0,
        configuration_locked: false,
        feature_config_initialized: false,
        event_id: nextEventId,
        submissions_locked: false,
        registration_locked: false,
        global_announcement: ""
      };

      const { data: resetData, error: resetErr } = await supabaseAdmin
        .from("settings")
        .update(resetPayload)
        .eq("id", 1)
        .select()
        .single();

      if (resetErr) throw resetErr;

      return NextResponse.json({
        success: true,
        message: `Event reset successfully. Initialized Event #${nextEventId} setup.`,
        data: resetData
      });
    }

    // 2. Evaluate Feature Configuration Changes & Lock Rules
    const isChangingFeatureConfig =
      body.feature_checkpoints_enabled !== undefined ||
      body.feature_strikes_enabled !== undefined ||
      body.feature_scoring_enabled !== undefined ||
      body.commit_interval_hours !== undefined;

    if (isChangingFeatureConfig) {
      const isLocked =
        currentSettings?.configuration_locked === true ||
        currentSettings?.timer_status === "running" ||
        currentSettings?.timer_status === "paused";

      if (isLocked) {
        return NextResponse.json(
          {
            error: "Event configuration is locked while the hackathon is active or paused. Reset the event to configure a new hackathon."
          },
          { status: 403 }
        );
      }

      if (body.commit_interval_hours !== undefined) {
        const intervalNum = Number(body.commit_interval_hours);
        if (!ALLOWED_INTERVALS.includes(intervalNum)) {
          return NextResponse.json(
            { error: `Invalid commit interval. Must be one of: ${ALLOWED_INTERVALS.join(", ")} hours.` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Assemble Update Payload
    const updateData: any = {};
    if (body.submissions_locked !== undefined) updateData.submissions_locked = body.submissions_locked;
    if (body.registration_locked !== undefined) updateData.registration_locked = body.registration_locked;
    if (body.timer_status !== undefined) updateData.timer_status = body.timer_status;
    if (body.timer_start_time !== undefined) updateData.timer_start_time = body.timer_start_time;
    if (body.timer_accumulated_ms !== undefined) updateData.timer_accumulated_ms = body.timer_accumulated_ms;
    if (body.timer_duration_hours !== undefined) updateData.timer_duration_hours = body.timer_duration_hours;
    if (body.global_announcement !== undefined) updateData.global_announcement = body.global_announcement;

    // Feature switches
    if (body.feature_checkpoints_enabled !== undefined) updateData.feature_checkpoints_enabled = Boolean(body.feature_checkpoints_enabled);
    if (body.feature_strikes_enabled !== undefined) updateData.feature_strikes_enabled = Boolean(body.feature_strikes_enabled);
    if (body.feature_scoring_enabled !== undefined) updateData.feature_scoring_enabled = Boolean(body.feature_scoring_enabled);
    if (body.commit_interval_hours !== undefined) updateData.commit_interval_hours = Number(body.commit_interval_hours);

    // If admin explicitly saves feature config, mark initialized
    if (isChangingFeatureConfig) {
      updateData.feature_config_initialized = true;
    }

    // If starting hackathon, lock configuration
    if (body.timer_status === "running") {
      updateData.configuration_locked = true;
      updateData.feature_config_initialized = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("settings")
      .update(updateData)
      .eq("id", 1)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from("settings")
        .insert([{ id: 1, ...updateData }])
        .select()
        .single();

      if (upsertError) throw upsertError;

      if (body.global_announcement !== undefined && body.global_announcement.trim() !== "") {
        await sendDiscordNotification({
          content: `📢 **Global Announcement**\n\n${body.global_announcement}`,
        });
      }

      return NextResponse.json(upsertData);
    }

    if (error) throw error;

    if (body.global_announcement !== undefined && body.global_announcement.trim() !== "") {
      await sendDiscordNotification({
        content: `📢 **Global Announcement**\n\n${body.global_announcement}`,
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
