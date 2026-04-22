"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { LayoutDashboard, Flame, AlertCircle, FileText, QrCode } from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [classCode, setClassCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (userRole !== "STUDENT") {
      router.push(userRole === "ADMIN" ? "/analytics" : userRole === "TEACHER" ? "/teacher" : "/auth/signin");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/student/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }

        const classesRes = await fetch("/api/student/classes");
        if (classesRes.ok) {
          const classData = await classesRes.json();
          setClasses(classData);
        }
      } catch (err) {
        console.error("Failed to fetch stats");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [status, userRole, router]);

  const startCheckIn = async (sessionId: string) => {
    setActionError("");
    try {
      const tokenRes = await fetch(`/api/session/${sessionId}/qr`);
      const data = await tokenRes.json();
      if (!tokenRes.ok) {
        setActionError(data.error || "Failed to get session token");
        return;
      }
      router.push(`/session/${sessionId}/checkin?token=${encodeURIComponent(data.token)}`);
    } catch {
      setActionError("Failed to start check-in");
    }
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMessage("");
    setActionError("");
    setJoinLoading(true);

    try {
      const res = await fetch("/api/student/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: classCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to join class");
        return;
      }

      setJoinMessage(`Class found: ${data.class.name}`);
      setClassCode("");

      if (data.class.activeSession?.id) {
        startCheckIn(data.class.activeSession.id);
      } else {
        setActionError("Class found, but there is no active session right now.");
      }
    } catch {
      setActionError("Failed to join class");
    } finally {
      setJoinLoading(false);
    }
  };

  if (status === "loading" || isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 className="page-title">Personal Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Welcome back! You have <strong>{stats?.overallAttendance || 0}%</strong> total attendance. Keep it up!
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            const activeClass = classes.find((c) => c.activeSession);
            if (!activeClass?.activeSession?.id) {
              setActionError("No active session found in your classes.");
              return;
            }
            startCheckIn(activeClass.activeSession.id);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px' }}
        >
          <QrCode size={20} /> Check In Now
        </button>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>Class Attendance</h3>
            <form onSubmit={joinByCode} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                className="form-input"
                placeholder="Enter class code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                required
              />
              <button className="btn-primary" type="submit" disabled={joinLoading}>
                {joinLoading ? "Joining..." : "Join Class"}
              </button>
            </form>
            {classes.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No classes found for your university.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {classes.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {c.code} {c.roomName ? `· ${c.roomName}` : ""} · {c.teacher?.name}
                      </div>
                    </div>
                    {c.activeSession ? (
                      <button className="btn-primary" style={{ padding: "8px 12px", fontSize: "12px" }} onClick={() => startCheckIn(c.activeSession.id)}>
                        Check In
                      </button>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>No active session</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {joinMessage ? <p style={{ color: "var(--success)", marginTop: "8px", fontSize: "13px" }}>{joinMessage}</p> : null}
          {actionError ? <p style={{ color: "var(--danger)", marginTop: "8px", fontSize: "13px" }}>{actionError}</p> : null}
        </div>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="#ff4d4d" /> Current Streak
            </h3>
            <div style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px' }}>{stats?.streak || 0} <span style={{ fontSize: '20px', fontWeight: 600 }}>Days</span></div>
            <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px', fontWeight: 500 }}>Active 🔥 Top 5% in College</div>
          </div>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.05 }}>
             <Flame size={120} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutDashboard size={16} color="var(--zoom-blue)" /> Attendance Score
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(11, 92, 255, 0.1)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--zoom-blue)" strokeWidth="3" strokeDasharray={`${stats?.overallAttendance || 0}, 100`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                {stats?.overallAttendance || 0}%
              </div>
            </div>
            <div>
               <div style={{ fontWeight: 600 }}>Above Threshold</div>
               <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: 75% for eligibility</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#ef4444" /> Total Absences
          </h3>
          <div style={{ fontSize: '40px', fontWeight: '800' }}>{stats?.absences || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Recoverable via Leave Approvals</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '32px' }}>
        {/* Modules Breakdown */}
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Module Analytics</h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Export PDF</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats?.modules.map((m: any) => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{m.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: m.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>{m.percentage}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${m.percentage}%`, 
                    backgroundColor: m.percentage >= 85 ? 'var(--success)' : m.percentage >= 75 ? 'var(--zoom-blue)' : '#ef4444',
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resources & Gated Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
             <button onClick={() => router.push('/leave-requests')} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <FileText size={24} color="var(--zoom-blue)" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Request Leave</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
