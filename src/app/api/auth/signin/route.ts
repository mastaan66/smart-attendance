import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_production_key";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, face_image, device_id } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Missing email or password" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true, faceEmbeddings: true, devices: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // 1. Password Check
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || "");
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    // 2. Face Verification (MFA)
    if (!face_image) {
      return NextResponse.json({ success: false, message: "Face authentication required" }, { status: 400 });
    }

    const referenceEmbedding = user.faceEmbeddings[0]?.embedding;
    if (!referenceEmbedding) {
      return NextResponse.json({ success: false, message: "No face profile found. Please contact admin." }, { status: 400 });
    }

    try {
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL || "http://localhost:8000"}/api/ml/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: face_image,
          reference_embedding: JSON.parse(referenceEmbedding)
        })
      });

      const mlResult = await mlResponse.json();

      if (!mlResponse.ok) {
        return NextResponse.json({ 
          success: false, 
          message: mlResult.detail || "Face verification service error" 
        }, { status: mlResponse.status });
      }

      if (!mlResult.verified) {
        return NextResponse.json({ 
          success: false, 
          message: `Face verification failed (Score: ${mlResult.confidence ? mlResult.confidence.toFixed(2) : 'N/A'})` 
        }, { status: 401 });
      }
    } catch (mlError) {
      console.error("ML Service Error:", mlError);
      return NextResponse.json({ success: false, message: "Face verification service unavailable" }, { status: 503 });
    }

    // 3. Device Binding
    if (device_id) {
      const knownDevices = user.devices.map(d => d.deviceId);
      if (knownDevices.length > 0 && !knownDevices.includes(device_id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Unauthorized device. Please use your registered device." 
        }, { status: 403 });
      }

      // If it's a new device and they have no devices yet, register it
      if (knownDevices.length === 0) {
        await prisma.device.create({
          data: {
            userId: user.id,
            deviceId: device_id
          }
        });
      } else {
        // Update last login for the device
        await prisma.device.update({
          where: { deviceId: device_id },
          data: { lastLogin: new Date() }
        });
      }
    }

    // 4. Success - Issue Token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenantId 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return NextResponse.json({ 
      success: true, 
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        university: user.tenant.universityName
      }
    });

  } catch (error: any) {
    console.error("SIGNIN ERROR:", error.message);
    return NextResponse.json({ success: false, message: error.message || "Authentication failed" }, { status: 500 });
  }
}
