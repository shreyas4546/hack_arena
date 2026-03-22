import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("settings").select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || { submissions_locked: false });
}

export async function POST(request: Request) {
  try {
    const { submissions_locked } = await request.json();
    
    // Upsert settings with ID 1
    const { data, error } = await supabaseAdmin
      .from("settings")
      .upsert({ id: 1, submissions_locked })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
