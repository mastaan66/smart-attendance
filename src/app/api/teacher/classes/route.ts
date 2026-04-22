import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: (session.user as any).id,
        tenantId: (session.user as any).tenantId,
      },
      include: {
        schedules: true,
        sessions: {
          where: { endTime: null },
          orderBy: { startTime: "desc" },
          take: 1,
          select: { id: true, startTime: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, code, roomName, geofenceLat, geofenceLng, geofenceRadius, schedules } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existingClass = await prisma.class.findFirst({
      where: {
        tenantId: (session.user as any).tenantId,
        code: normalizedCode,
      },
      select: { id: true },
    });

    if (existingClass) {
      return NextResponse.json({ error: "Class code already exists in your university" }, { status: 409 });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        code: normalizedCode,
        roomName: roomName || "",
        geofenceLat: 0,
        geofenceLng: 0,
        geofenceRadius: 100,
        teacherId: (session.user as any).id,
        tenantId: (session.user as any).tenantId,
        schedules: {
          create: schedules?.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime
          })) || []
        }
      },
      include: {
        schedules: true
      }
    });

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });
  } catch (error) {
    console.error("CREATE CLASS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
