import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwned = await prisma.session.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: (session.user as any).id,
          tenantId: (session.user as any).tenantId,
        },
      },
      select: { id: true },
    });

    if (!isOwned) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    
    // --- OPTIMIZATION: Roster Caching (Iteration 41) ---
    const cacheKey = `session_roster:${sessionId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData));
    }
    // ---------------------------------------------------

    // Fetch attendances for this session
    const attendances = await prisma.attendance.findMany({
      where: { sessionId },
      include: {
        student: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Cache for 10 seconds
    await redis.set(cacheKey, JSON.stringify(attendances), "EX", 10);

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("ROSTER ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
