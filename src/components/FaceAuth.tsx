"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FaceAuthProps {
  sessionId: string;
  qrToken: string;
}

export default function FaceAuth({ sessionId, qrToken }: FaceAuthProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"initializing" | "ready" | "scanning" | "success" | "failed">("initializing");
  const [message, setMessage] = useState("Warming up camera...");
  const [countdown, setCountdown] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus("ready");
          setMessage("Position your face in the circle");
        }
      } catch (err) {
        console.error(err);
        setStatus("failed");
        setMessage("Camera access denied. Please enable permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || status !== "ready") return;
    if (!sessionId || !qrToken) {
      setStatus("failed");
      setMessage("Session token missing. Please rescan the teacher QR and try again.");
      return;
    }

    setStatus("scanning");
    setMessage("Analyzing biometrics...");
    
    try {
      // 1. Get GPS coordinates
      if (!navigator.geolocation) {
         throw new Error("Geolocation not supported");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      // 2. Capture face frame
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas failure");
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      // 3. Call Check-in API
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          qrToken,
          face_image: imageData,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      });

      const result = await res.json();

      if (result.success) {
        setStatus("success");
        setMessage("Verified! Attendance marked.");
        setTimeout(() => router.push("/student"), 2000);
      } else {
        setStatus("failed");
        setMessage(result.error || "Verification failed");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
      setMessage(err.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Facial Identity Check</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Please keep your face steady and look directly at the camera.
        </p>
      </div>
      
      <div style={{ position: 'relative', width: '100%', borderRadius: '24px', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '1/1' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        
        {/* Scanning Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            width: '240px',
            height: '240px',
            border: `3px solid ${status === 'success' ? 'var(--success)' : status === 'failed' ? 'var(--danger)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: '50%',
            boxShadow: '0 0 0 999px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease'
          }}>
             {status === "scanning" && (
                <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--zoom-blue)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
             )}
          </div>
        </div>

        {/* Status Indicators */}
        {status === "success" && (
           <div className="animate-in" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(34, 197, 94, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <CheckCircle2 size={64} />
              <div style={{ marginTop: '16px', fontWeight: 700, fontSize: '20px' }}>Identity Verified</div>
           </div>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px',
          padding: '16px',
          borderRadius: '16px',
          backgroundColor: status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.03)',
          color: status === 'failed' ? 'var(--danger)' : 'inherit',
          marginBottom: '24px'
        }}>
           {status === "scanning" ? <Loader2 className="spin" size={20} /> : status === "failed" ? <AlertCircle size={20} /> : <Camera size={20} />}
           <span style={{ fontWeight: 600, fontSize: '15px' }}>{message}</span>
        </div>

        {status === "ready" && (
          <button onClick={handleCapture} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
            Capture & Verify
          </button>
        )}

        {status === "failed" && (
          <button onClick={() => setStatus("ready")} className="btn-secondary" style={{ width: '100%', padding: '16px' }}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
