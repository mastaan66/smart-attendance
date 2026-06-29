import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, face_image } = body;

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const emailParts = normalizedEmail.split("@");

    if (normalizedName.length < 2 || emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
      return NextResponse.json({ success: false, message: "Invalid name or university email" }, { status: 400 });
    }

    if (password.length < 12) {
      return NextResponse.json({ success: false, message: "Password must be at least 12 characters" }, { status: 400 });
    }

    if (typeof face_image !== "string" || face_image.length > 7_000_000) {
      return NextResponse.json({ success: false, message: "A valid face image is required" }, { status: 400 });
    }

    // --- SECURITY: Rate Limiting (Iteration 64) ---
    const { success } = await checkRateLimit(`rate_limit:signup:${normalizedEmail}`, 3, 3600); // 3 attempts per hour per email
    if (!success) {
      return NextResponse.json({ success: false, message: "Too many registration attempts. Please try again later." }, { status: 429 });
    }
    // ----------------------------------------------

    const domain = emailParts[1];
    
    const university = await prisma.tenant.findUnique({
      where: { domain }
    });

    if (!university) {
      return NextResponse.json({ 
        success: false, 
        message: `Your email domain (@${domain}) is not registered.` 
      }, { status: 403 });
    }

    // Extract embedding from image using ML Service
    let extractedEmbedding: number[] | null = null;
    if (face_image) {
      try {
        const mlResponse = await fetch(`${process.env.ML_SERVICE_URL || "http://localhost:8000"}/api/ml/extract_embedding`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: face_image }),
          signal: AbortSignal.timeout(10_000),
        });
        
        const mlResult = await mlResponse.json();
        
        if (!mlResponse.ok) {
           return NextResponse.json({ 
             success: false, 
             message: mlResult.detail || "Biometric extraction failed" 
           }, { status: mlResponse.status });
        }

        if (Array.isArray(mlResult.embedding) && mlResult.embedding.length > 0) {
          extractedEmbedding = mlResult.embedding;
        } else {
          return NextResponse.json({ success: false, message: "Face not detected or poor quality." }, { status: 400 });
        }
      } catch (err) {
        console.error("ML Service Error during signup:", err);
        return NextResponse.json({ success: false, message: "Biometric service unavailable." }, { status: 503 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          passwordHash,
          role: "STUDENT",
          tenantId: university.id,
          isBiometricVerified: true,
        }
      });

      if (extractedEmbedding) {
        await tx.faceEmbedding.create({
          data: {
            userId: user.id,
            embedding: JSON.stringify(extractedEmbedding)
          }
        });
      }

      return user;
    });

    return NextResponse.json({ 
      success: true, 
      message: "Registration successful",
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });

  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return NextResponse.json({ success: false, message: "Registration failed" }, { status: 500 });
  }
}
