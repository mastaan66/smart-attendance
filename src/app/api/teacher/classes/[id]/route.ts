import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
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
      select: { id: true },
    });

    if (!targetClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const sessions = await prisma.session.findMany({
      where: { classId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      if (sessionIds.length > 0) {
        await tx.attendance.deleteMany({
          where: {
            sessionId: { in: sessionIds },
          },
        });
      }
      await tx.session.deleteMany({ where: { classId } });
      await tx.schedule.deleteMany({ where: { classId } });
      await tx.class.delete({ where: { id: classId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CLASS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
