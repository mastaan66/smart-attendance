import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateQRToken } from "@/lib/qr";
import redis, { checkRateLimit } from "@/lib/redis";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371e3; // metres
  const x =
    (((lon2 - lon1) * Math.PI) / 180) *
    Math.cos(((lat1 + lat2) * Math.PI) / 360);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

type VerificationResult = { verified: boolean; confidence: number };

async function verifyFace(
  image: string,
  referenceEmbedding: unknown,
): Promise<VerificationResult> {
  const response = await fetch(
    `${process.env.ML_SERVICE_URL || "http://localhost:8000"}/api/ml/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: image,
        reference_embedding: referenceEmbedding,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Face verification service returned ${response.status}`);
  }

  const result = await response.json();
  return {
    verified: result.verified === true,
    confidence: typeof result.confidence === "number" ? result.confidence : 0,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, qrToken, face_image, lat, lng } = await req.json();

    if (
      typeof sessionId !== "string" ||
      typeof qrToken !== "string" ||
      typeof face_image !== "string" ||
      face_image.length > 7_000_000 ||
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // --- SECURITY: Rate Limiting (Iteration 8) ---
    const { success } = await checkRateLimit(
      `rate_limit:checkin:${session.user.id}`,
      5,
      60,
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many check-in attempts. Please wait 60 seconds." },
        { status: 429 },
      );
    }
    // ---------------------------------------------

    // 1. Fetch Session & User Details in Parallel
    const [dbSession, user] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { faceEmbeddings: true },
      }),
    ]);

    if (!dbSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!user || user.faceEmbeddings.length === 0) {
      return NextResponse.json(
        { error: "No face profile found" },
        { status: 404 },
      );
    }

    if (user.tenantId !== dbSession.class.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: user.id,
          classId: dbSession.classId,
        },
      },
      select: { status: true },
    });

    if (enrollment?.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Active class enrollment required" },
        { status: 403 },
      );
    }

    if (dbSession.endTime) {
      return NextResponse.json(
        { error: "Session has already ended" },
        { status: 400 },
      );
    }

    // 2. Validate QR Token
    if (!validateQRToken(dbSession.qrSeed, qrToken)) {
      return NextResponse.json(
        { error: "Invalid or expired QR code. Please scan again." },
        { status: 401 },
      );
    }

    // 3. Geofence Check
    const distance = calculateDistance(
      lat,
      lng,
      dbSession.class.geofenceLat,
      dbSession.class.geofenceLng,
    );
    if (distance > dbSession.class.geofenceRadius) {
      return NextResponse.json(
        {
          error: "You are outside the permitted attendance area",
        },
        { status: 403 },
      );
    }

    const embeddings = user.faceEmbeddings.map((fe) =>
      JSON.parse(fe.embedding!),
    );

    const results = await Promise.all(
      embeddings.map((referenceEmbedding) =>
        verifyFace(face_image, referenceEmbedding),
      ),
    );

    // Find the best result (highest confidence)
    const bestResult = results.reduce(
      (prev, curr) => (curr.confidence > prev.confidence ? curr : prev),
      { verified: false, confidence: 0 },
    );

    if (!bestResult.verified) {
      return NextResponse.json(
        { error: "Face mismatch", confidence: bestResult.confidence },
        { status: 401 },
      );
    }

    const mlResult = bestResult;
    // ----------------------------------------------------------------------

    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: user.id,
        },
      },
      update: {
        status: "PRESENT",
        faceScore: mlResult.confidence,
        geoStatus: true,
      },
      create: {
        sessionId,
        studentId: user.id,
        status: "PRESENT",
        faceScore: mlResult.confidence,
        geoStatus: true,
      },
    });

    await Promise.all([
      redis.del(
        `student_stats:${user.id}`,
        `session_roster:${sessionId}`,
        `admin_stats:${user.tenantId}`,
      ),
      redis.publish(
        `attendance_events:${dbSession.class.teacherId}`,
        JSON.stringify({
          type: "CHECKIN",
          studentName: user.name,
          timestamp: new Date().toISOString(),
          sessionId,
        }),
      ),
    ]).catch((cacheError) => console.error("CHECKIN CACHE ERROR:", cacheError));

    return NextResponse.json({
      success: true,
      message: "Checked in successfully!",
      attendance,
    });
  } catch (error) {
    console.error("CHECKIN ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
