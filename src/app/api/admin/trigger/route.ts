import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cronSecret = process.env.CRON_SECRET || "";
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${appUrl}/api/cron/monitor`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to trigger monitor.");

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Manual Trigger Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
