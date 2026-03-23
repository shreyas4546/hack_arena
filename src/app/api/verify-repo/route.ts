import { NextResponse } from "next/server";
import { getLatestPushTime } from "@/lib/github";

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();
    if (!repoUrl) {
      return NextResponse.json({ error: "No repository URL provided" }, { status: 400 });
    }
    
    const lastPush = await getLatestPushTime(repoUrl);
    
    if (lastPush) {
      return NextResponse.json({ success: true, lastPush: lastPush.toISOString() });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Repository is private, misspelled, or entirely empty. The HackArena engine cannot see it." 
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
