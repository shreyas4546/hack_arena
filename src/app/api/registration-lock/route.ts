import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("settings").select("registration_locked").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registration_locked: data?.registration_locked || false });
}

export async function POST(request: Request) {
  try {
    const { locked } = await request.json();
    if (typeof locked !== "boolean") {
      return NextResponse.json({ error: "Missing 'locked' boolean field" }, { status: 400 });
    }
    
    const { error } = await supabaseAdmin
      .from("settings")
      .update({ registration_locked: locked })
      .eq("id", 1);
      
    if (error) throw error;
    return NextResponse.json({ success: true, registration_locked: locked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
