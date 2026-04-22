import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    // --- OPTIMIZATION: Redis Caching (Iteration 1) ---
    const cacheKey = `student_stats:${studentId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData));
    }
    // ------------------------------------------------

    // 1. Fetch all attendance records for this student
    const attendances = await prisma.attendance.findMany({
      where: { studentId },
      select: {
        timestamp: true,
        durationSeconds: true,
        sessionId: true
      },
      orderBy: { timestamp: 'desc' }
    });

    // 2. Calculate Stats
    const threshold = 0.75;
    const sessionDurations = await prisma.session.findMany({
      where: {
        id: {
          in: attendances.map((a) => a.sessionId),
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    const sessionDurationById = new Map(
      sessionDurations.map((s) => {
        const end = s.endTime ?? new Date();
        const seconds = Math.max(1, Math.floor((end.getTime() - s.startTime.getTime()) / 1000));
        return [s.id, seconds];
      })
    );

    const presentSessions = attendances.filter((a) => {
      const durationSeconds = sessionDurationById.get(a.sessionId) ?? 3600;
      return a.durationSeconds / durationSeconds >= threshold;
    });
    const attendancePercentage = attendances.length > 0 
      ? Math.round((presentSessions.length / attendances.length) * 100) 
      : 0;

    // 3. Streak Calculation (Consecutive days with at least one attendance)
    let streak = 0;
    const attendanceDates = [...new Set(attendances.map(a => a.timestamp.toISOString().split('T')[0]))];
    
    if (attendanceDates.length > 0) {
      let currentDate = new Date();
      for (let i = 0; i < attendanceDates.length; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (attendanceDates.includes(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          // If we miss today, streak might still be active from yesterday
          if (i === 0) {
            currentDate.setDate(currentDate.getDate() - 1);
            const yesterdayStr = currentDate.toISOString().split('T')[0];
            if (attendanceDates.includes(yesterdayStr)) {
              continue; // Keep checking from yesterday
            }
          }
          break;
        }
      }
    }

    // 4. Modules List
    const modules = await prisma.class.findMany({
      where: {
        tenantId: (session.user as any).tenantId
      },
      include: {
        sessions: {
          include: {
            attendances: {
              where: { studentId },
            },
          },
        },
      }
    });

    const moduleStats = modules.map((classInfo) => {
      const moduleAttendances = classInfo.sessions.flatMap((s) =>
        s.attendances.map((attendance) => ({ ...attendance, session: s }))
      );
      const modulePresent = moduleAttendances.filter((a) => {
        const end = a.session.endTime ?? new Date();
        const sessionSeconds = Math.max(1, Math.floor((end.getTime() - a.session.startTime.getTime()) / 1000));
        return a.durationSeconds / sessionSeconds >= threshold;
      });
      const percent = moduleAttendances.length > 0 
        ? Math.round((modulePresent.length / moduleAttendances.length) * 100) 
        : 0;
      
      return {
        id: classInfo.id,
        name: classInfo.name,
        percentage: percent,
        status: percent >= 85 ? "Excellent" : percent >= 75 ? "Good" : "Warning"
      };
    });

    const result = {
      overallAttendance: attendancePercentage,
      streak,
      absences: attendances.length - presentSessions.length,
      modules: moduleStats
    };

    // Cache the result for 60 seconds
    await redis.set(cacheKey, JSON.stringify(result), "EX", 60);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("STUDENT STATS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
