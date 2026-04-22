import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — fetch biometric metadata (no raw embedding vectors exposed)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const embeddings = await prisma.faceEmbedding.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        // Deliberately omit embedding, faceDescriptor, vector for privacy
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBiometricVerified: true },
    });

    return NextResponse.json({
      embeddings,
      isBiometricVerified: user?.isBiometricVerified ?? false,
      count: embeddings.length,
    });
  } catch (error) {
    console.error("BIOMETRIC GET ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — GDPR "Right to be Forgotten" — purge all biometric data for this user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Delete all face embeddings for this user
    await prisma.faceEmbedding.deleteMany({ where: { userId } });

    // Also clear the faceDescriptor on the user record and revoke biometric flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBiometricVerified: false,
        faceDescriptor: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "All biometric data has been permanently deleted. You will need to re-enroll to use face attendance.",
    });
  } catch (error) {
    console.error("BIOMETRIC DELETE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
