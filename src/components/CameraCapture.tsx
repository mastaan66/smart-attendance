"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (image: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, buttonText = "Capture Image", disabled = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: 640, height: 480 } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsLoading(false);
      } catch (err) {
        setError("Camera access denied. Please enable camera permissions.");
        setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (disabled) return;
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        // --- OPTIMIZATION: Client-side Resizing (Iteration 15) ---
        // Resize to 480x480 for optimal balance between accuracy and payload size
        canvasRef.current.width = 480;
        canvasRef.current.height = 480;
        
        // Draw only the center part (squaring the image)
        const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
        const startX = (videoRef.current.videoWidth - size) / 2;
        const startY = (videoRef.current.videoHeight - size) / 2;
        
        context.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 480, 480);
        const imageData = canvasRef.current.toDataURL("image/jpeg", 0.85); // JPEG compression
        onCapture(imageData);
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: '4/3', 
        backgroundColor: '#000', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '2px solid var(--border-color)'
      }}>
        {isLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Initializing Camera...</div>}
        {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', padding: '20px', textAlign: 'center' }}>{error}</div>}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Face Overlay Guide */}
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          width: '180px', 
          height: '240px', 
          border: '2px dashed rgba(255, 255, 255, 0.5)', 
          borderRadius: '50%',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
        }} />
      </div>
      
      <button 
        onClick={captureImage}
        disabled={!!error || isLoading || disabled}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--zoom-blue)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          opacity: (error || isLoading) ? 0.5 : 1
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}
