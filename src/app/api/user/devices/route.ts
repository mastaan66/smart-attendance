import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — list all registered devices for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastLogin: "desc" },
      select: {
        id: true,
        deviceId: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("DEVICES GET ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — revoke a registered device
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }

    // Ensure the device belongs to this user before deleting
    const device = await prisma.device.findFirst({
      where: { id, userId },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    await prisma.device.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Device revoked successfully" });
  } catch (error) {
    console.error("DEVICE DELETE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
