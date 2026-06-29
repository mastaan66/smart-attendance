import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const studentId = session.user.id;
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: "ACTIVE",
        class: { tenantId },
      },
      include: {
        class: {
          include: {
            teacher: { select: { name: true, email: true } },
            sessions: {
              where: { endTime: null },
              orderBy: { startTime: "desc" },
              take: 1,
              select: { id: true, startTime: true },
            },
          },
        },
      },
      orderBy: { class: { name: "asc" } },
    });

    return NextResponse.json(
      enrollments.map(({ class: classItem }) => ({
        id: classItem.id,
        code: classItem.code,
        name: classItem.name,
        roomName: classItem.roomName,
        teacher: classItem.teacher,
        activeSession: classItem.sessions[0] ?? null,
      }))
    );
  } catch (error) {
    console.error("GET STUDENT CLASSES ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return NextResponse.json({ error: "Class code is required" }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const studentId = session.user.id;
    const classItem = await prisma.class.findFirst({
      where: {
        tenantId,
        code: normalizedCode,
      },
      include: {
        teacher: { select: { name: true, email: true } },
        sessions: {
          where: { endTime: null },
          orderBy: { startTime: "desc" },
          take: 1,
          select: { id: true, startTime: true },
        },
      },
    });

    if (!classItem) {
      return NextResponse.json({ error: "Invalid class code" }, { status: 404 });
    }

    await prisma.enrollment.upsert({
      where: {
        studentId_classId: { studentId, classId: classItem.id },
      },
      update: { status: "ACTIVE" },
      create: {
        studentId,
        classId: classItem.id,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      class: {
        id: classItem.id,
        code: classItem.code,
        name: classItem.name,
        roomName: classItem.roomName,
        teacher: classItem.teacher,
        activeSession: classItem.sessions[0] ?? null,
      },
    });
  } catch (error) {
    console.error("JOIN CLASS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
