"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDemo } from "@/context/DemoContext";
import { useState } from "react";
import DemoRoleModal from "@/components/DemoRoleModal";
import { UserCheck, MapPin, Timer } from "lucide-react";

export default function LandingPage() {
  const { setIsDemoMode } = useDemo();
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Navigation */}
      <nav style={{ 
        padding: '20px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '36px', height: '36px', backgroundColor: 'var(--zoom-blue)', borderRadius: '8px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' 
          }}>SC</div>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>Smart Campus</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <ThemeToggle />
          <Link href="/auth/signin" style={{ color: 'var(--text-color)', fontWeight: 500, textDecoration: 'none' }}>Login</Link>
          <Link href="/auth/signup" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '80px 40px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '64px', fontWeight: 800, marginBottom: '24px', letterSpacing: '-2px' }}>
          Next-Gen Attendance with <span style={{ color: 'var(--zoom-blue)' }}>Geo-Fencing & AI.</span>
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: 1.6 }}>
          A production-grade truth verification system. Prove physical presence using military-grade face recognition and multi-signal location validation.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link href="/auth/register-university" className="btn-primary" style={{ padding: '16px 32px', fontSize: '18px' }}>Register University</Link>
          <button 
            onClick={() => { setIsModalOpen(true); }}
            className="btn-primary" 
            style={{ 
              padding: '16px 32px', fontSize: '18px', backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' 
            }}
          >
            Explore Demo
          </button>
        </div>
        <DemoRoleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </header>

      {/* How It Works */}
      <section style={{ padding: '80px 40px', backgroundColor: 'var(--bg-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 700, marginBottom: '60px' }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
            <div className="card">
              <div style={{ color: 'var(--zoom-blue)', marginBottom: '20px' }}><UserCheck size={32} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Biometric Onboarding</h3>
              <p style={{ color: 'var(--text-muted)' }}>Students register their unique facial embeddings using our high-precision FaceNet microservice.</p>
            </div>
            <div className="card">
              <div style={{ color: 'var(--zoom-blue)', marginBottom: '20px' }}><MapPin size={32} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Geo-Fence Validation</h3>
              <p style={{ color: 'var(--text-muted)' }}>Presence is confirmed using PostGIS geofences. Spoofing attempts are blocked at the network level.</p>
            </div>
            <div className="card">
              <div style={{ color: 'var(--zoom-blue)', marginBottom: '20px' }}><Timer size={32} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Continuous Tracking</h3>
              <p style={{ color: 'var(--text-muted)' }}>Attendance is verified throughout the class duration to enforce the 75% presence criteria.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Entry */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '40px' }}>Ready to Sign In?</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/auth/signin?role=STUDENT" className="btn-primary" style={{ backgroundColor: 'var(--card-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>I'm a Student</Link>
          <Link href="/auth/signin?role=TEACHER" className="btn-primary" style={{ backgroundColor: 'var(--card-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>I'm a Teacher</Link>
          <Link href="/auth/signin?role=ADMIN" className="btn-primary" style={{ backgroundColor: 'var(--card-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>I'm an Admin</Link>
        </div>
      </section>

      <footer style={{ padding: '40px', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
        &copy; 2026 Smart Campus SaaS. Production-Grade Enterprise Solutions.
      </footer>
    </div>
  );
}
