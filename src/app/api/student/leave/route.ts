import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, reason, classCode } = await req.json();

    if (!startDate || !endDate || !reason || !classCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDateValue = Date.parse(startDate);
    const endDateValue = Date.parse(endDate);

    if (Number.isNaN(startDateValue) || Number.isNaN(endDateValue)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const normalizedCode = String(classCode).trim().toUpperCase();
    const targetClass = await prisma.class.findFirst({
      where: {
        code: normalizedCode,
        tenantId: (session.user as any).tenantId,
      },
      select: { id: true },
    });

    if (!targetClass) {
      return NextResponse.json({ error: "Invalid class code" }, { status: 404 });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        studentId: (session.user as any).id,
        classId: targetClass.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, leaveRequest }, { status: 201 });
  } catch (error: any) {
    console.error("LEAVE SUBMISSION ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        studentId: (session.user as any).id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(leaveRequests);
  } catch (error: any) {
    console.error("LEAVE FETCH ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
