import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "This legacy sign-in endpoint is disabled. Use the session-based sign-in flow.",
    },
    { status: 410 },
  );
}
