import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = session.user.id as string;
    const tenantId = session.user.tenantId as string;
    const cacheKey = `student_stats:${studentId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData));
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: "ACTIVE",
        class: { tenantId },
      },
      include: {
        class: {
          include: {
            sessions: {
              where: { endTime: { not: null } },
              orderBy: { startTime: "asc" },
              include: {
                attendances: {
                  where: { studentId },
                  select: { status: true, timestamp: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { class: { name: "asc" } },
    });

    const modules = enrollments.map((enrollment) => {
      const eligibleSessions = enrollment.class.sessions.filter(
        (classSession) => Boolean(classSession.endTime && classSession.endTime >= enrollment.joinedAt),
      );
      const presentSessions = eligibleSessions.filter(
        (classSession) => classSession.attendances[0]?.status === "PRESENT",
      );
      const percentage = eligibleSessions.length
        ? Math.round((presentSessions.length / eligibleSessions.length) * 100)
        : 0;

      return {
        id: enrollment.class.id,
        name: enrollment.class.name,
        percentage,
        status: percentage >= 85 ? "Excellent" : percentage >= 75 ? "Good" : "Warning",
        eligibleSessions,
        presentSessions,
      };
    });

    const eligibleSessions = modules.flatMap((module) => module.eligibleSessions);
    const presentSessions = modules.flatMap((module) => module.presentSessions);
    const overallAttendance = eligibleSessions.length
      ? Math.round((presentSessions.length / eligibleSessions.length) * 100)
      : 0;

    const attendanceDates = new Set(
      presentSessions
        .map((classSession) => classSession.attendances[0]?.timestamp)
        .filter((timestamp): timestamp is Date => Boolean(timestamp))
        .map(utcDateKey),
    );

    let streak = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    if (!attendanceDates.has(utcDateKey(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (attendanceDates.has(utcDateKey(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const result = {
      overallAttendance,
      streak,
      absences: eligibleSessions.length - presentSessions.length,
      modules: modules.map((module) => ({
        id: module.id,
        name: module.name,
        percentage: module.percentage,
        status: module.status,
      })),
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 60);
    return NextResponse.json(result);
  } catch (error) {
    console.error("STUDENT STATS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
