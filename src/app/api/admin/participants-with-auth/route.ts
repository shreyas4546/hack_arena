import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// Prevent Next.js from caching this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const eventParam = url.searchParams.get("event_id");

    // 1. Fetch teams for the current active event (or requested event)
    let query = supabaseAdmin
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (eventParam === "all") {
      // Return all events
    } else if (eventParam) {
      const eid = parseInt(eventParam, 10);
      if (!isNaN(eid)) {
        query = query.eq("event_id", eid);
      }
    } else {
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("event_id")
        .eq("id", 1)
        .single();
      const activeEventId = settings?.event_id || 1;
      query = query.eq("event_id", activeEventId);
    }

    let { data: teams, error } = await query;

    if (error && (error.code === '42703' || error.message?.includes('does not exist') || error.code === 'PGRST204')) {
      const fallbackRes = await supabaseAdmin
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });
      if (!fallbackRes.error && fallbackRes.data) {
        teams = fallbackRes.data;
        error = null;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 3. Map emails to team data
    const enhancedTeams = (teams || []).map((team: any) => {
      const authUser = authData.users.find(u => u.id === team.auth_user_id);
      return {
        ...team,
        email: authUser?.email || "Unknown",
      };
    });

    const response = NextResponse.json(enhancedTeams);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
