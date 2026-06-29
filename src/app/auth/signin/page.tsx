"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";

import { Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    searchParams.get("success") === "registered"
      ? "Registration successful! Please sign in."
      : searchParams.get("success") === "uni_registered"
        ? "University created successfully. Please sign in."
        : "",
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/student");
        router.refresh();
      }
    } catch {
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
          Access your campus dashboard
        </p>

        {successMsg && <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{successMsg}</div>}
        {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" name="email" className="form-input" required value={formData.email} onChange={handleInputChange} placeholder="name@university.edu" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input" required value={formData.password} onChange={handleInputChange} />
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
            Don&apos;t have an account? <Link href="/auth/signup" style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>Create one</Link>
          </p>
        </form>
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
