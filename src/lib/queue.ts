import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import prisma from "./prisma";

// Use a shared Redis connection for queues and workers
const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

export const locationPingQueue = new Queue("LocationPingQueue", {
  connection,
});

// Create a worker to process location pings in the background
// In a real production environment, this worker might run in a separate Node.js process/container
export const locationWorker = new Worker(
  "LocationPingQueue",
  async (job) => {
    const { sessionId, studentId, lat, lng, timestamp } = job.data;
    
    // 1. Get the session and class details to check geofence
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { 
        class: true,
        attendances: {
          where: { studentId }
        }
      },
    });

    if (!session || session.attendances.length === 0) return;

    const attendance = session.attendances[0];
    
    // Only process if the student has successfully checked in and is marked PRESENT
    if (attendance.status !== "PRESENT") return;

    // 2. Haversine formula to check if within geofence
    const distance = calculateDistance(
      lat,
      lng,
      session.class.geofenceLat,
      session.class.geofenceLng
    );

    const isInZone = distance <= session.class.geofenceRadius;

    // 3. Update the record
    // We assume pings come every 1 minute (60 seconds)
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        geoStatus: isInZone,
        durationSeconds: isInZone ? { increment: 60 } : undefined,
        timestamp: new Date() // Update last seen
      }
    });

    if (!isInZone) {
      console.log(`Student ${studentId} is out of zone for session ${sessionId}`);
    }
  },
  { connection, concurrency: 10 }
);

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  // --- OPTIMIZATION: Equirectangular approximation (Iteration 52) ---
  // Faster than Haversine for small distances (campus scale)
  const R = 6371e3; // metres
  const x = (lon2 - lon1) * Math.PI / 180 * Math.cos((lat1 + lat2) * Math.PI / 360);
  const y = (lat2 - lat1) * Math.PI / 180;
  return Math.sqrt(x * x + y * y) * R;
}
