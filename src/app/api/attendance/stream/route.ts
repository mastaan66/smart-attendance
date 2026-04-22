import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import IORedis from "ioredis";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "TEACHER") {
    return new Response("Unauthorized", { status: 401 });
  }

  const teacherId = (session.user as any).id;
  const redis = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  });

  const stream = new ReadableStream({
    start(controller) {
      const channel = `attendance_events:${teacherId}`;
      
      redis.subscribe(channel, (err) => {
        if (err) {
          console.error("Redis Subscribe Error:", err);
          controller.close();
        }
      });

      redis.on("message", (chan, message) => {
        if (chan === channel) {
          controller.enqueue(`data: ${message}\n\n`);
        }
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        controller.enqueue(": keep-alive\n\n");
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        redis.unsubscribe(channel);
        redis.quit();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
