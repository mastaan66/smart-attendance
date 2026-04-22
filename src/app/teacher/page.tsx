"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherConsole() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [activeSession, setActiveSession] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [roster, setRoster] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [actionError, setActionError] = useState<string>("");

  useEffect(() => {
    if (status === "loading") return;
    if (userRole !== "TEACHER") {
      router.push(userRole === "ADMIN" ? "/analytics" : userRole === "STUDENT" ? "/student" : "/auth/signin");
      return;
    }

    const fetchClasses = async () => {
      const res = await fetch("/api/teacher/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      }
    };
    fetchClasses();

    const fetchLeaves = async () => {
      const res = await fetch("/api/teacher/leave");
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.filter((l: any) => l.status === "PENDING"));
      }
    };
    fetchLeaves();
  }, [status, userRole, router]);

  const startSession = async () => {
    if (!selectedClassId) return;

    setActionError("");

    if (!navigator.geolocation) {
      setActionError("Geolocation is not supported in this browser.");
      return;
    }

    let coords: GeolocationCoordinates;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      coords = position.coords;
    } catch {
      setActionError("Unable to read your location. Allow location permission and try again.");
      return;
    }

    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        geofenceLat: coords.latitude,
        geofenceLng: coords.longitude,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setActiveSession(data.session);
    } else {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "Failed to start session.");
    }
  };

  const endSession = async () => {
    if (!activeSession?.id) return;

    const res = await fetch(`/api/session/${activeSession.id}/end`, {
      method: "POST",
    });

    if (res.ok) {
      setActiveSession(null);
      setRoster([]);
      setQrCode(null);
    }
  };

  const handleLeaveAction = async (id: string, status: string) => {
    const res = await fetch(`/api/teacher/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setLeaveRequests(prev => prev.filter(l => l.id !== id));
    }
  };

  useEffect(() => {
    let qrInterval: NodeJS.Timeout;
    let eventSource: EventSource;

    if (status === "loading") return;
    if (userRole !== "TEACHER") return;

    if (activeSession) {
      const refreshQR = async () => {
        const res = await fetch(`/api/session/${activeSession.id}/qr`);
        if (res.ok) {
          const data = await res.json();
          setQrCode(data.token);
        }
      };
      refreshQR();
      qrInterval = setInterval(refreshQR, 15000);

      // --- OPTIMIZATION: SSE Real-time Updates (Iteration 42) ---
      eventSource = new EventSource("/api/attendance/stream");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "CHECKIN" && data.sessionId === activeSession.id) {
            // Optimistically update or fetch roster
            fetchRoster();
          }
        } catch (err) {
          console.error("SSE Parse Error:", err);
        }
      };
      // ---------------------------------------------------------

      const fetchRoster = async () => {
        const res = await fetch(`/api/session/${activeSession.id}/roster`);
        if (res.ok) {
          const data = await res.json();
          setRoster(data);
        }
      };
      fetchRoster();
    }

    return () => {
      clearInterval(qrInterval);
      if (eventSource) eventSource.close();
    };
  }, [activeSession]);

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Teacher Console</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Manage your active classes and view live attendance rosters.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!activeSession ? (
            <>
              <select 
                className="form-input" 
                style={{ width: '200px' }} 
                value={selectedClassId} 
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.length === 0 ? <option value="">No classes yet</option> : null}
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Link className="btn-primary" href="/classes" style={{ textDecoration: "none" }}>
                Manage Classes
              </Link>
              <button className="btn-primary" onClick={startSession} disabled={!selectedClassId}>
                Start Session
              </button>
            </>
          ) : (
            <button className="btn-primary" style={{ backgroundColor: 'var(--danger)' }} onClick={endSession}>
              Stop Session
            </button>
          )}
        </div>
      </div>
      {actionError ? (
        <div className="card" style={{ marginBottom: "16px", border: "1px solid var(--danger)", color: "var(--danger)" }}>
          {actionError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Live Roster Column */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            Live Roster {activeSession && <span style={{ color: 'var(--success)', fontSize: '14px', marginLeft: '8px' }}>● Live</span>}
          </h3>
          
          {!activeSession ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No active session. Click "Start Session" to begin tracking.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-muted)' }}>Student Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-muted)' }}>Duration (In Zone)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-muted)' }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.student.name}</td>
                    <td style={{ padding: '12px 16px', color: r.geoStatus ? 'var(--success)' : 'var(--danger)' }}>
                      {r.geoStatus ? 'Inside Geofence' : 'Out of Zone'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{Math.floor(r.durationSeconds / 60)} mins</td>
                    <td style={{ padding: '12px 16px', color: 'var(--warning)' }}>
                      {r.durationSeconds < 2700 && r.geoStatus === false ? 'Left Early' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* QR Code Column */}
        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Session QR Code</h3>
          {activeSession ? (
            <>
              <div style={{ width: '200px', height: '200px', backgroundColor: 'var(--bg-color)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>[QR Code: {qrCode}]</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                Project this on the screen.<br/>Refreshes every 15 seconds.
              </p>
            </>
          ) : (
             <div style={{ width: '200px', height: '200px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', color: 'var(--text-muted)' }}>
               Offline
             </div>
          )}
        </div>
      </div>

      {/* Leave Requests Section */}
      <div className="card" style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Pending Leave Requests</h3>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {leaveRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No pending requests.</div>
          ) : (
            leaveRequests.map((l) => (
              <div key={l.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{l.student.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Reason: {l.reason} ({new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: 'var(--success)', padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleLeaveAction(l.id, "APPROVED")}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: 'var(--danger)', padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleLeaveAction(l.id, "REJECTED")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
