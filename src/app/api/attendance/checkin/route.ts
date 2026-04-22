import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateQRToken } from "@/lib/qr";
import redis, { checkRateLimit } from "@/lib/redis";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const x = (lon2 - lon1) * Math.PI / 180 * Math.cos((lat1 + lat2) * Math.PI / 360);
  const y = (lat2 - lat1) * Math.PI / 180;
  return Math.sqrt(x * x + y * y) * R;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, qrToken, face_image, lat, lng } = await req.json();

    if (
      !sessionId ||
      !qrToken ||
      !face_image ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // --- SECURITY: Rate Limiting (Iteration 8) ---
    const { success } = await checkRateLimit(`rate_limit:checkin:${(session.user as any).id}`, 5, 60);
    if (!success) {
      return NextResponse.json({ error: "Too many check-in attempts. Please wait 60 seconds." }, { status: 429 });
    }
    // ---------------------------------------------

    // 1. Fetch Session & User Details in Parallel
    const [dbSession, user] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: true }
      }),
      prisma.user.findUnique({
        where: { id: (session.user as any).id },
        include: { faceEmbeddings: true }
      })
    ]);

    if (!dbSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!user || user.faceEmbeddings.length === 0) {
      return NextResponse.json({ error: "No face profile found" }, { status: 404 });
    }

    if (dbSession.endTime) {
      return NextResponse.json({ error: "Session has already ended" }, { status: 400 });
    }

    // 2. Validate QR Token
    if (!validateQRToken(dbSession.qrSeed, qrToken)) {
       return NextResponse.json({ error: "Invalid or expired QR code. Please scan again." }, { status: 401 });
    }

    // 3. Geofence Check
    const distance = calculateDistance(lat, lng, dbSession.class.geofenceLat, dbSession.class.geofenceLng);
    if (distance > dbSession.class.geofenceRadius) {
       return NextResponse.json({
        error: `Out of zone (Distance: ${Math.round(distance)}m)`,
        debug: {
          studentLat: lat,
          studentLng: lng,
          classGeofenceLat: dbSession.class.geofenceLat,
          classGeofenceLng: dbSession.class.geofenceLng,
          classGeofenceRadius: dbSession.class.geofenceRadius,
          distanceMeters: Math.round(distance),
        },
      }, { status: 403 });
    }

    const embeddings = user.faceEmbeddings.map(fe => JSON.parse(fe.embedding!));
    
    // --- OPTIMIZATION: Parallel Multi-Vector Verification (Iteration 38) ---
    const verificationPromises = embeddings.map(refVec => 
      fetch(`${process.env.ML_SERVICE_URL || "http://localhost:8000"}/api/ml/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: face_image,
          reference_embedding: refVec
        })
      }).then(res => res.json())
    );

    const results = await Promise.all(verificationPromises);
    
    // Find the best result (highest confidence)
    const bestResult = results.reduce((prev, curr) => 
      (curr.confidence > prev.confidence) ? curr : prev, 
      { verified: false, confidence: 0 }
    );

    if (!bestResult.verified) {
      return NextResponse.json({ error: "Face mismatch", confidence: bestResult.confidence }, { status: 401 });
    }
    
    const mlResult = bestResult; 
    // ----------------------------------------------------------------------

    // 5. Create or Update Attendance Record for this student-session pair
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        sessionId,
        studentId: (session.user as any).id,
      },
      select: { id: true },
    });

    const attendance = existingAttendance
      ? await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            status: "PRESENT",
            faceScore: mlResult.confidence,
            geoStatus: true,
          },
        })
      : await prisma.attendance.create({
          data: {
            sessionId,
            studentId: (session.user as any).id,
            status: "PRESENT",
            faceScore: mlResult.confidence,
            geoStatus: true,
          },
        });

    // --- OPTIMIZATION: Real-time Pub/Sub (Iteration 31) ---
    await redis.publish(`attendance_events:${dbSession.class.teacherId}`, JSON.stringify({
      type: "CHECKIN",
      studentName: user.name,
      timestamp: new Date().toISOString(),
      sessionId
    }));
    // -----------------------------------------------------

    return NextResponse.json({ success: true, message: "Checked in successfully!", attendance });

  } catch (error: any) {
    console.error("CHECKIN ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
