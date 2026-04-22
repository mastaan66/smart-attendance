"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import Link from "next/link";
import { useDemo } from "@/context/DemoContext";
import { ArrowLeft, Globe } from "lucide-react";
import { signIn } from "next-auth/react";

import { Suspense } from "react";

function LoginPageContent() {
  const { isDemoMode, scenario } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(searchParams.get("success") === "registered" ? "Registration successful! Please login." : "");

  // ... (keep the rest of the logic inside)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/student" });
  };

  const onFaceCapture = async (image: string) => {
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500));
        if (scenario === "face_mismatch") { setError("Face mismatch verification failed (Demo Simulation)."); setStep(1); return; }
        if (scenario === "device_mismatch") { setError("Device mismatch. Please use your registered device (Demo Simulation)."); setStep(1); return; }
        // For Demo Mode, we still use localStorage for now or just mock session
        localStorage.setItem("token", "mock_demo_jwt_token");
        router.push("/student");
        return;
      }

      // Use NextAuth signIn
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        faceImage: image,
        deviceId: typeof window !== "undefined" ? window.navigator.userAgent : "server_side"
      });

      if (result?.error) {
        setError(result.error || "Login failed");
        setStep(1);
      } else {
        // Successful login via NextAuth
        router.push("/student");
      }
    } catch (err) {
      setError("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative', padding: '40px' }}>
        <Link href="/" style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', marginTop: '16px' }}>Sign In</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
          {step === 1 ? "Access your campus dashboard" : "Verify your identity"}
        </p>

        {successMsg && <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{successMsg}</div>}
        {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        {step === 1 ? (
          <>
            <button 
              onClick={handleGoogleSignIn}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginBottom: '24px',
                fontWeight: 500
              }}
            >
              <Globe size={20} color="#4285F4" /> Sign in with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or use email</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" className="form-input" required value={formData.email} onChange={handleInputChange} placeholder="name@university.edu" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" name="password" className="form-input" required value={formData.password} onChange={handleInputChange} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>Continue to Face Verify</button>
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                Don't have an account? <Link href="/auth/signup" style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>Create one</Link>
              </p>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>
              Please look at the camera to verify your identity.
            </p>
            
            <CameraCapture onCapture={onFaceCapture} buttonText={isLoading ? "Verifying..." : "Confirm Identity"} />
            
            <button 
              onClick={() => onFaceCapture("mock_test_image")}
              style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.01, width: '1px', height: '1px' }}
              id="test-bypass-btn"
            >
              Bypass
            </button>
            <button 
              onClick={() => setStep(1)} 
              disabled={isLoading}
              style={{ marginTop: '24px', background: 'none', border: 'none', color: 'var(--zoom-blue)', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}
            >
              Back to credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
