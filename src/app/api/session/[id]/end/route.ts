import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const teacherId = (session.user as any).id;
    const tenantId = (session.user as any).tenantId;

    const targetSession = await prisma.session.findFirst({
      where: {
        id,
        endTime: null,
        class: {
          teacherId,
          tenantId,
        },
      },
      select: { id: true },
    });

    if (!targetSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: { endTime: new Date() },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error("END SESSION ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
