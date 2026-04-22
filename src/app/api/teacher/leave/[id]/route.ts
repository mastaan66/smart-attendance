import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, comment } = await req.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const target = await prisma.leaveRequest.findFirst({
      where: {
        id,
        class: {
          teacherId: (session.user as any).id,
          tenantId: (session.user as any).tenantId,
        },
      },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: id },
      data: { status, comment }
    });

    return NextResponse.json({ success: true, leaveRequest: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
