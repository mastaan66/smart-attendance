import { Queue } from "bullmq";

export interface LocationPingJob {
  sessionId: string;
  studentId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

let locationPingQueue: Queue<LocationPingJob> | undefined;

export function getLocationPingQueue(): Queue<LocationPingJob> {
  if (!locationPingQueue) {
    locationPingQueue = new Queue<LocationPingJob>("LocationPingQueue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    });
  }

  return locationPingQueue;
}
