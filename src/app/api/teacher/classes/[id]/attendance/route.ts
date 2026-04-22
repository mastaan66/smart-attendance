import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classId } = await params;
    const teacherId = (session.user as any).id;
    const tenantId = (session.user as any).tenantId;

    const targetClass = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
        tenantId,
      },
      select: { id: true, name: true, code: true },
    });

    if (!targetClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        session: {
          classId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 500,
    });

    return NextResponse.json({
      class: targetClass,
      attendances,
    });
  } catch (error) {
    console.error("CLASS ATTENDANCE FETCH ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
