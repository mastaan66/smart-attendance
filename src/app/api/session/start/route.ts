import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId, geofenceLat, geofenceLng } = await req.json();
    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }
    if (
      typeof geofenceLat !== "number" ||
      typeof geofenceLng !== "number" ||
      !Number.isFinite(geofenceLat) ||
      !Number.isFinite(geofenceLng)
    ) {
      return NextResponse.json({ error: "Teacher location is required to start session" }, { status: 400 });
    }

    // Verify teacher owns the class
    const targetClass = await prisma.class.findFirst({
      where: { 
        id: classId,
        teacherId: (session.user as any).id
      }
    });

    if (!targetClass) {
      return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 404 });
    }

    // Update geofence center from teacher live location for this attendance session.
    await prisma.class.update({
      where: { id: classId },
      data: {
        geofenceLat,
        geofenceLng,
      },
    });

    const existingActiveSession = await prisma.session.findFirst({
      where: {
        classId,
        endTime: null,
      },
      orderBy: { startTime: "desc" },
    });

    if (existingActiveSession) {
      return NextResponse.json({ success: true, session: existingActiveSession });
    }

    // Create session with random seed
    const qrSeed = crypto.randomBytes(32).toString("hex");
    const newSession = await prisma.session.create({
      data: {
        classId,
        qrSeed
      }
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    console.error("START SESSION ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
