import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This endpoint would typically be called by a CRON scheduler like Vercel Cron, GitHub Actions, or AWS EventBridge
export async function POST(req: Request) {
  try {
    // 1. Authenticate CRON request securely (e.g., matching a secret token)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find sessions that just ended but haven't been finalized yet
    const now = new Date();
    const endedSessions = await prisma.session.findMany({
      where: {
        endTime: {
          lte: now, // Sessions that ended in the past
        },
      },
      include: {
        attendances: true,
      }
    });

    // 3. Process the 75% Rule
    for (const session of endedSessions) {
      if (!session.endTime) continue;

      // Calculate total session length in seconds
      const totalSessionSeconds = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      const thresholdSeconds = totalSessionSeconds * 0.75;

      for (const attendance of session.attendances) {
        let finalStatus = "ABSENT";

        if (attendance.durationSeconds >= thresholdSeconds) {
          finalStatus = "PRESENT";
        } else if (attendance.durationSeconds > 0) {
          finalStatus = "PARTIAL"; // They showed up but left early or arrived too late
        }

        // 4. Update the record
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: { status: finalStatus },
        });

        // Optional Phase 5 step: If finalStatus is ABSENT/PARTIAL, trigger "At-Risk" email worker here.
      }
    }

    return NextResponse.json({ success: true, processed: endedSessions.length });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
