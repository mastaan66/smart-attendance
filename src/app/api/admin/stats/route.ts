import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;

    const cacheKey = `admin_stats:${tenantId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData));
    }

    const totalStudents = await prisma.user.count({
      where: { tenantId, role: "STUDENT" },
    });

    const totalSessions = await prisma.session.count({
      where: { class: { tenantId } },
    });

    const classes = await prisma.class.findMany({
      where: { tenantId },
      include: {
        teacher: { select: { id: true, name: true } },
        sessions: {
          include: { attendances: true },
          orderBy: { startTime: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const threshold = 0.75;
    const sessionDuration = 3600;

    const allAttendances = classes.flatMap((c) => c.sessions.flatMap((s) => s.attendances));
    const presentCount = allAttendances.filter(
      (a) => a.durationSeconds / sessionDuration >= threshold
    ).length;

    const overallAvg = allAttendances.length > 0
      ? Math.round((presentCount / allAttendances.length) * 100)
      : 0;

    const classStats = classes.map((c) => {
      const classAttendances = c.sessions.flatMap((s) => s.attendances);
      const classPresent = classAttendances.filter(
        (a) => a.durationSeconds / sessionDuration >= threshold
      ).length;
      const avg = classAttendances.length > 0
        ? Math.round((classPresent / classAttendances.length) * 100)
        : 0;

      return {
        id: c.id,
        name: c.name,
        average: avg,
      };
    });

    const classList = classes.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      roomName: c.roomName,
      teacher: c.teacher,
      geofenceRadius: c.geofenceRadius,
      activeSession: c.sessions.find((s) => s.endTime === null) ?? null,
    }));

    const result = {
      totalStudents,
      totalSessions,
      overallAvg,
      classStats,
      classes: classList,
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    return NextResponse.json(result);
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
