import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function tokenMatches(actual: string | null, expected: string): boolean {
  if (!actual) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  try {
    const onboardingToken = process.env.UNIVERSITY_ONBOARDING_TOKEN;
    if (!onboardingToken) {
      return NextResponse.json({ success: false, message: "Institution onboarding is not configured" }, { status: 503 });
    }

    if (!tokenMatches(request.headers.get("x-university-onboarding-token"), onboardingToken)) {
      return NextResponse.json({ success: false, message: "Invalid institution onboarding token" }, { status: 403 });
    }

    const body = await request.json();
    const { university, admin } = body;

    if (
      !university || !admin
      || typeof university.name !== "string"
      || typeof university.domain !== "string"
      || typeof admin.name !== "string"
      || typeof admin.email !== "string"
      || typeof admin.password !== "string"
    ) {
      return NextResponse.json({ success: false, message: "Missing required data" }, { status: 400 });
    }

    const domain = university.domain.trim().toLowerCase().replace(/^@/, "");
    const adminEmail = admin.email.trim().toLowerCase();
    const adminEmailDomain = adminEmail.split("@")[1];

    if (!domain || adminEmailDomain !== domain) {
      return NextResponse.json({ success: false, message: "Admin email must use the university domain" }, { status: 400 });
    }

    if (admin.password.length < 12) {
      return NextResponse.json({ success: false, message: "Admin password must be at least 12 characters" }, { status: 400 });
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { domain }
    });

    if (existingTenant) {
      return NextResponse.json({ success: false, message: "This university domain is already registered." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(admin.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const newUniversity = await tx.tenant.create({
        data: {
          universityName: university.name.trim(),
          domain,
          location: typeof university.location === "string" ? university.location.trim() : "",
        },
      });

      const newUser = await tx.user.create({
        data: {
          name: admin.name.trim(),
          email: adminEmail,
          passwordHash,
          role: "ADMIN",
          tenantId: newUniversity.id,
        },
      });

      return { universityId: newUniversity.id, userId: newUser.id };
    });

    return NextResponse.json({ 
      success: true, 
      message: "University and Admin registered successfully",
      data: result 
    });

  } catch (error) {
    console.error("REGISTER UNIVERSITY ERROR:", error);
    return NextResponse.json({ success: false, message: "Registration failed" }, { status: 500 });
  }
}
