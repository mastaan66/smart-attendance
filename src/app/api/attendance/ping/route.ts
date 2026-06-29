import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLocationPingQueue } from "@/lib/queue";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return apiError("Unauthorized", 401);
    }

    const body = await req.json();
    const { sessionId, lat, lng } = body;

    if (!sessionId || !lat || !lng) {
      return apiError("Missing required fields");
    }

    // Add job to BullMQ queue for background processing
    await getLocationPingQueue().add("ping", {
      sessionId,
      studentId: session.user.id,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    return apiSuccess("Ping queued");
  } catch (error) {
    console.error("Error queueing ping:", error);
    return apiError("Internal server error", 500);
  }
}
