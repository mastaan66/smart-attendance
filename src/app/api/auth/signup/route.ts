import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, face_image } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // --- SECURITY: Rate Limiting (Iteration 64) ---
    const { success } = await checkRateLimit(`rate_limit:signup:${email}`, 3, 3600); // 3 attempts per hour per email
    if (!success) {
      return NextResponse.json({ success: false, message: "Too many registration attempts. Please try again later." }, { status: 429 });
    }
    // ----------------------------------------------

    // Students MUST provide a face image for onboarding
    if ((role === "STUDENT" || !role) && !face_image) {
       return NextResponse.json({ success: false, message: "Face onboarding is required for students." }, { status: 400 });
    }

    const domain = email.split("@")[1];
    
    // Use 'tenant' as it matches the current stable schema/cache
    const university = await (prisma as any).tenant.findUnique({
      where: { domain: domain }
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
          body: JSON.stringify({ image_base64: face_image })
        });
        
        const mlResult = await mlResponse.json();
        
        if (!mlResponse.ok) {
           return NextResponse.json({ 
             success: false, 
             message: mlResult.detail || "Biometric extraction failed" 
           }, { status: mlResponse.status });
        }

        if (mlResult.embedding) {
          extractedEmbedding = mlResult.embedding;
        } else {
          return NextResponse.json({ success: false, message: "Face not detected or poor quality." }, { status: 400 });
        }
      } catch (err) {
        console.error("ML Service Error during signup:", err);
        return NextResponse.json({ success: false, message: "Biometric service unavailable." }, { status: 503 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role || "STUDENT",
          tenantId: university.id
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

  } catch (error: any) {
    console.error("SIGNUP ERROR:", error.message);
    return NextResponse.json({ success: false, message: error.message || "Registration failed" }, { status: 500 });
  }
}
