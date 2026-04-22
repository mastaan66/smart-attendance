"use client";

import { useDemo } from "@/context/DemoContext";
import { useRouter } from "next/navigation";
import { User, UserCog } from "lucide-react";

interface DemoRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoRoleModal({ isOpen, onClose }: DemoRoleModalProps) {
  const { setIsDemoMode } = useDemo();
  const router = useRouter();

  if (!isOpen) return null;

  const handleRoleSelect = (role: "student" | "teacher") => {
    setIsDemoMode(true);
    localStorage.setItem("token", `mock_demo_${role}_token`);
    onClose();
    router.push(`/${role}`);
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '12px' }}>Choose Demo Role</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
          Select a role to explore the Smart Campus dashboard in demo mode.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => handleRoleSelect("student")}
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
          >
            <User size={20} /> Enter as Student
          </button>
          <button 
            onClick={() => handleRoleSelect("teacher")}
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', backgroundColor: 'var(--card-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
          >
            <UserCog size={20} /> Enter as Teacher
          </button>
        </div>

        <button 
          onClick={onClose}
          style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
