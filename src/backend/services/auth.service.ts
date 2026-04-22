import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export class AuthService {
  static async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  static async generateToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  }

  static calculateCosineSimilarity(vecA: number[], vecB: number[]) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
  }

  static async signup(data: any) {
    const { name, email, password, role, face_embedding, device_id } = data;

    const hashedPassword = await this.hashPassword(password);
    const domain = email.split("@")[1];
    const tenant = await prisma.tenant.findUnique({ where: { domain } });
    
    if (!tenant) throw new Error("Tenant not found for this domain");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
        tenantId: tenant.id,
        faceEmbeddings: {
          create: {
            embedding: JSON.stringify(face_embedding),
          },
        },
        devices: {
          create: {
            deviceId: device_id,
          },
        },
      },
    });

    const token = await this.generateToken({ id: user.id, role: user.role });
    return { user, token };
  }

  static async login(data: any) {
    const { email, password, face_embedding, device_id } = data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { faceEmbeddings: true, devices: true },
    });

    if (!user) throw new Error("Invalid credentials");

    // 1. Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || "");
    if (!isPasswordValid) throw new Error("Invalid credentials");

    // 2. Validate Device
    const isDeviceValid = user.devices.some(d => d.deviceId === device_id);
    if (!isDeviceValid) throw new Error("Device mismatch. Please use your registered device.");

    // 3. Compare Face Embedding (Use Redis Caching)
    const cacheKey = `user_embedding:${user.id}`;
    let refEmbedding;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      refEmbedding = JSON.parse(cached);
    } else {
      const dbEmbedding = user.faceEmbeddings[0]?.embedding || user.faceEmbeddings[0]?.vector;
      if (!dbEmbedding) throw new Error("No face profile found");
      refEmbedding = JSON.parse(dbEmbedding);
      await redis.setex(cacheKey, 3600, JSON.stringify(refEmbedding)); // Cache for 1 hour
    }

    const similarity = this.calculateCosineSimilarity(face_embedding, refEmbedding);
    
    const THRESHOLD = 0.85; // Configurable
    if (similarity < THRESHOLD) {
      throw new Error("Face mismatch verification failed.");
    }

    // 4. Update last login
    await prisma.device.update({
      where: { deviceId: device_id },
      data: { lastLogin: new Date() },
    });

    const token = await this.generateToken({ id: user.id, role: user.role });
    return { user, token };
  }
}
