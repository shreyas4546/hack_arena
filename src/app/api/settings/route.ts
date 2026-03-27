import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendDiscordNotification } from "@/lib/discord";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("settings").select("*").single();
  if (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || { submissions_locked: false });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updateData: any = {};
    if (body.submissions_locked !== undefined) updateData.submissions_locked = body.submissions_locked;
    if (body.registration_locked !== undefined) updateData.registration_locked = body.registration_locked;
    if (body.timer_status !== undefined) updateData.timer_status = body.timer_status;
    if (body.timer_start_time !== undefined) updateData.timer_start_time = body.timer_start_time;
    if (body.timer_accumulated_ms !== undefined) updateData.timer_accumulated_ms = body.timer_accumulated_ms;
    if (body.timer_duration_hours !== undefined) updateData.timer_duration_hours = body.timer_duration_hours;
    if (body.global_announcement !== undefined) updateData.global_announcement = body.global_announcement;

    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("settings")
      .update(updateData)
      .eq("id", 1)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      // If table is empty, upsert first row
      const { data: upsertData, error: upsertError } = await supabaseAdmin.from("settings").insert([{ id: 1, ...updateData }]).select().single();
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
