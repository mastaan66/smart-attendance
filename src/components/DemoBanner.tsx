"use client";

import { useDemo } from "@/context/DemoContext";
import { useRouter } from "next/navigation";

export default function DemoBanner() {
  const { isDemoMode, setIsDemoMode, scenario, setScenario } = useDemo();
  const router = useRouter();

  if (!isDemoMode) return null;

  const handleExitDemo = () => {
    setIsDemoMode(false);
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div style={{ 
      backgroundColor: '#fff7e6', 
      borderBottom: '1px solid #ffd591', 
      padding: '8px 24px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      fontSize: '13px',
      color: '#d46b08',
      fontWeight: 500,
      position: 'sticky',
      top: 0,
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>⚠️ <strong>Demo Mode Active</strong> (Using Mock Responses)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Scenario:</span>
          <select 
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            style={{ 
              backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid #d9d9d9', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' 
            }}
          >
            <option value="success">Successful Login</option>
            <option value="face_mismatch">Face Mismatch</option>
            <option value="device_mismatch">Device Mismatch</option>
          </select>
        </div>
      </div>
      <button 
        onClick={handleExitDemo}
        style={{ 
          background: 'none', border: '1px solid #d46b08', borderRadius: '4px', padding: '2px 12px', 
          fontSize: '12px', color: '#d46b08', cursor: 'pointer' 
        }}
      >
        Exit Demo
      </button>
    </div>
  );
}
