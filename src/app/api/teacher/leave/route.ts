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

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        class: {
          teacherId: (session.user as any).id,
          tenantId: (session.user as any).tenantId,
        },
      },
      include: {
        student: {
          select: { name: true, email: true }
        },
        class: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(leaveRequests);
  } catch (error: any) {
    console.error("TEACHER LEAVE FETCH ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
