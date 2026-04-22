"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import FaceAuth from "@/components/FaceAuth";

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("token") || "";

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Session Check-In</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Please authenticate yourself and confirm your location.
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <FaceAuth sessionId={id} qrToken={qrToken} />
      </div>
    </div>
  );
}
