import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { team_id, judge_score }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Missing or invalid updates array" }, { status: 400 });
    }

    // Process each update
    // Note: We use a loop here for simplicity with Supabase single updates, 
    // but in a high-concurrency environment, a RPC or single query would be better.
    const results = await Promise.all(
      updates.map(u => 
        supabaseAdmin
          .from("teams")
          .update({ judge_score: Number(u.judge_score) })
          .eq("id", u.team_id)
      )
    );

    const firstError = results.find(r => r.error);
    if (firstError) {
      throw firstError.error;
    }

    return NextResponse.json({ success: true, message: `Updated ${updates.length} scores successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
