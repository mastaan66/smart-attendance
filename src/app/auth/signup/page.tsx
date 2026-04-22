"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const CameraCapture = dynamic(() => import("@/components/CameraCapture"), { ssr: false });
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UniversitySearch from "@/components/UniversitySearch";
import { University } from "@/data/universities";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT"
  });
  const [images, setImages] = useState<string[]>([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const submitTimerRef = useRef<number | null>(null);

  const handleUniversitySelect = (uni: University) => {
    setSelectedUni(uni);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onCapture = (image: string) => {
    setImages((prev) => {
      if (prev.length >= 3 || autoSubmitted) return prev;
      return [...prev, image];
    });
  };

  useEffect(() => {
    if (submitTimerRef.current) {
      window.clearTimeout(submitTimerRef.current);
    }

    if (images.length === 3 && !autoSubmitted) {
      setAutoSubmitted(true);
      submitTimerRef.current = window.setTimeout(() => {
        handleSubmit();
      }, 100);
    }

    return () => {
      if (submitTimerRef.current) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, [images, autoSubmitted]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          university_domain: selectedUni?.domain,
          face_image: images[0], // Sending the first captured image for registration
          device_id: typeof window !== "undefined" ? window.navigator.userAgent : "server_side"
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push("/auth/signin?success=registered");
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError("An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        <Link href="/" style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', marginTop: '16px' }}>Create Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
          Step {step} of 2: {step === 1 ? "Profile Details" : "Biometric Setup"}
        </p>

        {error && <div style={{ padding: '12px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', color: '#ff4d4f', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <div className="form-group">
              <label className="form-label">Search University</label>
              <UniversitySearch onSelect={handleUniversitySelect} initialValue={selectedUni?.name || ""} />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="form-input" required value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-input" required value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-input" required value={formData.password} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-input" value={formData.role} onChange={handleInputChange}>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>Continue to Face Scan</button>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
              Already have an account? <Link href="/auth/signin" style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>Login</Link>
            </p>
          </form>
        ) : (
          <div>
            <p style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              Please capture 3 images of your face for high-precision registration.
            </p>
            
            <CameraCapture onCapture={onCapture} buttonText={`Capture Image ${Math.min(images.length + 1, 3)} / 3`} disabled={images.length >= 3 || autoSubmitted} />
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ 
                  width: '60px', height: '60px', borderRadius: '8px', border: '2px solid var(--border-color)', 
                  overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative'
                }}>
                  {images[i] ? <img src={images[i]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>?</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>Back</button>
              <button 
                onClick={handleSubmit} 
                className="btn-primary" 
                disabled={images.length < 3 || isLoading}
                style={{ flex: 2 }}
              >
                {isLoading ? "Registering..." : "Complete Signup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
