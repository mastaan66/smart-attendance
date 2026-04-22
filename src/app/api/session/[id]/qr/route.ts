import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateQRToken } from "@/lib/qr";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const tenantId = (session.user as any).tenantId;

    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: {
            id: true,
            teacherId: true,
            tenantId: true,
          },
        },
      },
    });

    if (!dbSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (dbSession.class.tenantId !== tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userRole === "TEACHER") {
      if (dbSession.class.teacherId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (userRole === "STUDENT") {
      // Students from the same tenant can retrieve the active rotating token.
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (dbSession.endTime) {
      return NextResponse.json({ error: "Session has ended" }, { status: 400 });
    }

    const token = generateQRToken(dbSession.qrSeed);

    return NextResponse.json({ token, refreshIn: 15000 - (Date.now() % 15000) });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
