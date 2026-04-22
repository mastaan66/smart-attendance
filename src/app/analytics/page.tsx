"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ClassRow {
  id: string;
  name: string;
  code: string;
  roomName: string;
  geofenceRadius: number;
  teacher: { id: string; name: string };
  activeSession: { id: string; startTime: string } | null;
}

interface AdminStats {
  totalStudents: number;
  totalSessions: number;
  overallAvg: number;
  classStats: Array<{ id: string; name: string; average: number }>;
  classes: ClassRow[];
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== "ADMIN") return;

    setLoading(true);
    setError(null);

    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Unable to load admin analytics");
        }
        return res.json();
      })
      .then(setAdminStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userRole]);

  if (userRole === "ADMIN") {
    return (
      <div>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h2 className="page-title">Admin Analytics & Class Inventory</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              University-wide attendance intelligence and the complete class roster for your campus.
            </p>
          </div>
          <div>
            <button className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--zoom-blue)', border: '1px solid var(--zoom-blue)' }}>
              Export CSV Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            Loading admin analytics...
          </div>
        ) : error ? (
          <div className="card" style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        ) : adminStats ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div className="card">
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Total Students</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{adminStats.totalStudents}</div>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Total Class Sessions</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{adminStats.totalSessions}</div>
              </div>
              <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Average Verified Attendance</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>{adminStats.overallAvg}%</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="card" style={{ minHeight: '360px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Attendance Trends</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', alignItems: 'end', height: '220px' }}>
                  {[80, 85, 92, 88, 79].map((height, i) => (
                    <div key={i} style={{ backgroundColor: height < 80 ? 'var(--warning)' : 'var(--zoom-blue)', height: `${height}%`, borderRadius: '6px 6px 0 0' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                  <span>Week 5</span>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '18px' }}>Class Attendance Averages</h3>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {adminStats.classStats.slice(0, 4).map((stat) => (
                    <div key={stat.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                      <span>{stat.name}</span>
                      <strong>{stat.average}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>All Classes in University</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{adminStats.classes.length} classes</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Code</th>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Class</th>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Room</th>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Faculty</th>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Geofence</th>
                      <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminStats.classes.map((cls) => (
                      <tr key={cls.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{cls.code}</td>
                        <td style={{ padding: '14px 12px' }}>{cls.name}</td>
                        <td style={{ padding: '14px 12px' }}>{cls.roomName || '-'}</td>
                        <td style={{ padding: '14px 12px' }}>{cls.teacher?.name || 'Unknown'}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{Math.round(cls.geofenceRadius)}m</td>
                        <td style={{ padding: '14px 12px' }}>
                          {cls.activeSession ? new Date(cls.activeSession.startTime).toLocaleString() : 'No active session'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            No admin analytics available.
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="page-title">Campus Analytics & Insights</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            System-wide attendance health and automated early-warning flags.
          </p>
        </div>
        <div>
          <button className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--zoom-blue)', border: '1px solid var(--zoom-blue)' }}>
            Export CSV Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Global Attendance</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>89.2%</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>+1.2% from last week</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Average Punctuality</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>94%</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Arrived within 5 mins</p>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>At-Risk Students</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>28</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>&lt; 75% attendance threshold</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Attendance Trends (Last 30 Days)</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '16px 0', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
             <div style={{ position: 'absolute', top: '10%', width: '100%', borderTop: '1px dashed var(--border-color)', zIndex: 0 }}></div>
             <div style={{ position: 'absolute', top: '50%', width: '100%', borderTop: '1px dashed var(--border-color)', zIndex: 0 }}></div>
             {[80, 85, 92, 88, 75, 95, 98, 90, 85, 89].map((height, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: height < 80 ? 'var(--warning)' : 'var(--zoom-blue)', height: `${height}%`, borderRadius: '4px 4px 0 0', zIndex: 1, transition: 'height 0.3s' }}></div>
             ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Automated Intervention Flags</h3>
           <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Nightly cron job flagged these students falling below 75% module average.</p>
           <ul style={{ listStyle: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
              <li style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 500 }}>John Doe</div>
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>68%</span>
                 </div>
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>CS-401 · Warning Email Sent</div>
              </li>
              <li style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 500 }}>Sarah Jenkins</div>
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>71%</span>
                 </div>
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>DB-205 · Advisor Notified</div>
              </li>
           </ul>
        </div>

      </div>
    </div>
  );
}
