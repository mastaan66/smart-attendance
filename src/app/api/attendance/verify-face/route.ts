import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { face_image } = await req.json();
    if (!face_image) {
      return NextResponse.json({ error: "Face image required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { faceEmbeddings: true }
    });

    if (!user || user.faceEmbeddings.length === 0) {
      return NextResponse.json({ error: "No face profile found" }, { status: 404 });
    }

    const referenceEmbedding = JSON.parse(user.faceEmbeddings[0].embedding!);

    const mlResponse = await fetch(`${process.env.ML_SERVICE_URL || "http://localhost:8000"}/api/ml/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: face_image,
        reference_embedding: referenceEmbedding
      })
    });

    const mlResult = await mlResponse.json();

    if (mlResult.verified) {
      return NextResponse.json({ 
        success: true, 
        message: "Identity verified",
        confidence: mlResult.confidence 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Face mismatch",
        confidence: mlResult.confidence 
      }, { status: 401 });
    }

  } catch (error: any) {
    console.error("VERIFY FACE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
