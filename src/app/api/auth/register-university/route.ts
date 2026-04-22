import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { university, admin } = body;

    if (!university || !admin) {
      return NextResponse.json({ success: false, message: "Missing required data" }, { status: 400 });
    }

    // Check if domain is already registered
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain: university.domain }
    });

    if (existingTenant) {
      return NextResponse.json({ success: false, message: "This university domain is already registered." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(admin.password, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create University (Tenant)
      const uniModel = tx.tenant || tx.university;
      
      const uniData: any = {
        domain: university.domain,
      };

      if (tx.tenant) {
        uniData.universityName = university.name;
      } else {
        uniData.name = university.name;
        uniData.location = university.location || "";
      }

      const newUniversity = await uniModel.create({
        data: uniData
      });

      // 2. Create Super Admin User
      const userModel = tx.user;
      const userData: any = {
        name: admin.name,
        email: admin.email,
        role: "ADMIN",
        tenantId: newUniversity.id,
      };

      if (tx.user && (tx.user as any).fields?.passwordHash) {
        userData.passwordHash = passwordHash;
      } else {
        userData.password = passwordHash;
      }

      // Handle legacy faceDescriptor field on User
      if (admin.face_embedding) {
        userData.faceDescriptor = JSON.stringify(admin.face_embedding);
      }

      const newUser = await userModel.create({
        data: userData
      });

      // 3. Store Admin Face Embedding (if separate model exists)
      const faceModel = tx.faceEmbedding;
      if (admin.face_embedding && faceModel) {
        await faceModel.create({
          data: {
            userId: newUser.id,
            embedding: JSON.stringify(admin.face_embedding),
          }
        });
      }

      return { universityId: newUniversity.id, userId: newUser.id };
    });

    return NextResponse.json({ 
      success: true, 
      message: "University and Admin registered successfully",
      data: result 
    });

  } catch (error: any) {
    console.error("REGISTER UNIVERSITY ERROR:", error.message);
    return NextResponse.json({ success: false, message: error.message || "Registration failed" }, { status: 500 });
  }
}
