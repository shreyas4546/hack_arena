import { NextResponse } from "next/server";
import { isRegistrationLocked, setRegistrationLocked } from "@/lib/registration-lock";

export async function GET() {
  return NextResponse.json({ registration_locked: isRegistrationLocked() });
}

export async function POST(request: Request) {
  try {
    const { locked } = await request.json();
    if (typeof locked !== "boolean") {
      return NextResponse.json({ error: "Missing 'locked' boolean field" }, { status: 400 });
    }
    setRegistrationLocked(locked);
    return NextResponse.json({ success: true, registration_locked: locked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
