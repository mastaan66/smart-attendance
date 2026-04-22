"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import Link from "next/link";
import { Building2, User, ShieldCheck, FileCheck, ArrowRight, ArrowLeft } from "lucide-react";
import UniversitySearch from "@/components/UniversitySearch";
import { University } from "@/data/universities";

export default function UniversityRegistration() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [uniData, setUniData] = useState({
    name: "",
    domain: "",
    location: ""
  });

  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [images, setImages] = useState<string[]>([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const submitTimerRef = useRef<number | null>(null);

  const handleUniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUniData({ ...uniData, [e.target.name]: e.target.value });
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminData({ ...adminData, [e.target.name]: e.target.value });
  };

  const handleUniversitySelect = (uni: University) => {
    setUniData({
      name: uni.name,
      domain: uni.domain,
      location: uni.location
    });
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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    setIsLoading(true);
    setError("");

    try {
      // Mock ML call
      const mockEmbedding = Array.from({ length: 128 }, () => Math.random());

      const response = await fetch("/api/auth/register-university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university: uniData,
          admin: {
            ...adminData,
            face_embedding: mockEmbedding
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        router.push("/auth/signin?success=uni_registered");
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
      <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
        <Link href="/" style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', backgroundColor: 'rgba(11, 92, 255, 0.1)', 
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'var(--zoom-blue)', margin: '0 auto 16px' 
          }}>
            {step === 1 && <Building2 />}
            {step === 2 && <User />}
            {step === 3 && <ShieldCheck />}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Register University</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Step {step} of 3: {step === 1 ? "Institutional Info" : step === 2 ? "Admin Credentials" : "Identity Verification"}
          </p>
        </div>

        {error && <div style={{ padding: '12px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', color: '#ff4d4f', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        {step === 1 && (
          <div className="fade-in">
            <div className="form-group">
              <label className="form-label">Search University</label>
              <UniversitySearch onSelect={handleUniversitySelect} initialValue={uniData.name} />
            </div>
            <div className="form-group">
              <label className="form-label">Verified Domain</label>
              <input type="text" name="domain" className="form-input" placeholder="e.g. stanford.edu" required value={uniData.domain} onChange={handleUniChange} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Only emails ending in this domain will be able to register.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Campus Location</label>
              <input type="text" name="location" className="form-input" placeholder="City, Country" required value={uniData.location} onChange={handleUniChange} />
            </div>
            <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              Continue to Admin Setup <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <div className="form-group">
              <label className="form-label">Admin Full Name</label>
              <input type="text" name="name" className="form-input" required value={adminData.name} onChange={handleAdminChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Official Email</label>
              <input type="email" name="email" className="form-input" required value={adminData.email} onChange={handleAdminChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Root Password</label>
              <input type="password" name="password" className="form-input" required value={adminData.password} onChange={handleAdminChange} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
                <ArrowLeft size={18} /> Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary" style={{ flex: 2 }}>
                Continue to Face Scan <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <p style={{ textAlign: 'center', fontSize: '14px', marginBottom: '24px' }}>
              Register the Super Admin's biometric profile. This will be the master key for university-wide settings.
            </p>
            <CameraCapture onCapture={onCapture} buttonText={`Scan Admin Face (${Math.min(images.length + 1, 3)}/3)`} disabled={images.length >= 3 || autoSubmitted} />
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>Back</button>
              <button 
                onClick={handleSubmit} 
                className="btn-primary" 
                disabled={images.length < 3 || isLoading}
                style={{ flex: 2 }}
              >
                {isLoading ? "Provisioning Tenant..." : "Complete Registration"}
              </button>
            </div>
          </div>
        )}
        
        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}>
          By registering, you agree to the <Link href="/terms" style={{ color: 'var(--zoom-blue)' }}>Institutional Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
