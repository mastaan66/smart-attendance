import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET — fetch real profile for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        tenant: {
          select: { universityName: true, domain: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("PROFILE GET ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update display name
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("PROFILE PATCH ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — change password
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Password change not available for OAuth accounts" }, { status: 400 });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("PASSWORD CHANGE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;
    const { confirmPhrase } = await req.json();

    const expectedPhrase = userRole === "ADMIN" ? "DELETE MY UNIVERSITY" : "DELETE MY ACCOUNT";
    if (confirmPhrase !== expectedPhrase) {
      return NextResponse.json({ error: `Please type '${expectedPhrase}' to confirm.` }, { status: 400 });
    }

    if (userRole === "ADMIN") {
      const classes = await prisma.class.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);

      const sessions = await prisma.session.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      const tenantUsers = await prisma.user.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const tenantUserIds = tenantUsers.map((u) => u.id);

      if (sessionIds.length > 0) {
        await prisma.attendance.deleteMany({ where: { sessionId: { in: sessionIds } } });
      }

      if (classIds.length > 0) {
        await prisma.leaveRequest.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.schedule.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.class.deleteMany({ where: { id: { in: classIds } } });
      }

      if (tenantUserIds.length > 0) {
        await prisma.attendance.deleteMany({ where: { studentId: { in: tenantUserIds } } });
        await prisma.leaveRequest.deleteMany({ where: { studentId: { in: tenantUserIds } } });
        await prisma.faceEmbedding.deleteMany({ where: { userId: { in: tenantUserIds } } });
        await prisma.device.deleteMany({ where: { userId: { in: tenantUserIds } } });
      }

      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });

      return NextResponse.json({ success: true, message: "University and all related accounts deleted." });
    }

    if (userRole === "TEACHER") {
      const classes = await prisma.class.findMany({
        where: { teacherId: userId, tenantId },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);

      if (classIds.length > 0) {
        const sessions = await prisma.session.findMany({
          where: { classId: { in: classIds } },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);

        if (sessionIds.length > 0) {
          await prisma.attendance.deleteMany({ where: { sessionId: { in: sessionIds } } });
        }

        await prisma.leaveRequest.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.schedule.deleteMany({ where: { classId: { in: classIds } } });
        await prisma.class.deleteMany({ where: { id: { in: classIds } } });
      }

      await prisma.attendance.deleteMany({ where: { studentId: userId } });
      await prisma.leaveRequest.deleteMany({ where: { studentId: userId } });
      await prisma.faceEmbedding.deleteMany({ where: { userId } });
      await prisma.device.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      return NextResponse.json({ success: true, message: "Teacher account and related classes deleted." });
    }

    if (userRole === "STUDENT") {
      await prisma.attendance.deleteMany({ where: { studentId: userId } });
      await prisma.leaveRequest.deleteMany({ where: { studentId: userId } });
      await prisma.faceEmbedding.deleteMany({ where: { userId } });
      await prisma.device.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      return NextResponse.json({ success: true, message: "Student account deleted." });
    }

    return NextResponse.json({ error: "Unsupported role for account deletion" }, { status: 400 });
  } catch (error) {
    console.error("ACCOUNT DELETE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
