"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ClassItem = {
  id: string;
  code: string;
  name: string;
  roomName: string;
  geofenceLat: number;
  geofenceLng: number;
  geofenceRadius: number;
  sessions?: Array<{ id: string; startTime: string }>;
  _count?: { students: number };
};

const defaultForm = {
  name: "",
  code: "",
  roomName: "",
};

export default function ClassesPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [form, setForm] = useState(defaultForm);
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string; code: string } | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const fetchClasses = async () => {
    if (userRole !== "TEACHER") return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/classes");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load classes");
      } else {
        setClasses(data);
      }
    } catch {
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (userRole !== "TEACHER") {
      router.push(userRole === "ADMIN" ? "/analytics" : userRole === "STUDENT" ? "/student" : "/auth/signin");
      return;
    }

    fetchClasses();
  }, [status, userRole, router]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        roomName: form.roomName.trim(),
      };

      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create class");
      } else {
        setSuccess("Class created successfully.");
        setForm(defaultForm);
        await fetchClasses();
      }
    } catch {
      setError("Failed to create class");
    } finally {
      setSaving(false);
    }
  };

  const stopSession = async (sessionId: string) => {
    setError("");
    setSuccess("");
    const res = await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to stop session");
      return;
    }
    setSuccess("Session stopped. Attendance tracking has ended.");
    await fetchClasses();
  };

  const deleteClass = async (classId: string, className: string) => {
    if (!confirm(`Delete class "${className}"? This will remove sessions and attendance records.`)) return;
    setError("");
    setSuccess("");
    const res = await fetch(`/api/teacher/classes/${classId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete class");
      return;
    }
    setSuccess(`Class "${className}" deleted.`);
    await fetchClasses();
  };

  const viewClassAttendance = async (classId: string) => {
    setLoadingAttendance(true);
    setError("");
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/attendance`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch class attendance");
        return;
      }
      setSelectedClass(data.class);
      setAttendanceRows(data.attendances || []);
    } catch {
      setError("Failed to fetch class attendance");
    } finally {
      setLoadingAttendance(false);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2 className="page-title">Classes & Geofences</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
            Create classes and share class codes with students. Teacher live location is captured at session start.
          </p>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: "16px", border: "1px solid var(--danger)", color: "var(--danger)" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="card" style={{ marginBottom: "16px", border: "1px solid var(--success)", color: "var(--success)" }}>
          {success}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(0,0,0,0.02)" }}>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Code</th>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Class</th>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Room</th>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Students</th>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Geofence</th>
                <th style={{ padding: "14px 16px", fontWeight: 500, color: "var(--text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "20px 16px", color: "var(--text-muted)" }}>Loading classes...</td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "20px 16px", color: "var(--text-muted)" }}>
                    No classes yet. Create your first class using the form.
                  </td>
                </tr>
              ) : (
                classes.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: 600 }}>{item.code}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => viewClassAttendance(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--zoom-blue)",
                          cursor: "pointer",
                          fontWeight: 600,
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        {item.name}
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>{item.roomName || "-"}</td>
                    <td style={{ padding: "14px 16px" }}>{item._count?.students ?? 0}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                      Auto-set from teacher location when session starts ({Math.round(item.geofenceRadius)}m)
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {item.sessions?.[0]?.id ? (
                          <button
                            className="btn-primary"
                            style={{ padding: "6px 10px", fontSize: "12px", backgroundColor: "var(--danger)" }}
                            onClick={() => stopSession(item.sessions![0].id)}
                          >
                            Stop Session
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>No active session</span>
                        )}
                        <button
                          className="btn-primary"
                          style={{ padding: "6px 10px", fontSize: "12px", backgroundColor: "var(--danger)" }}
                          onClick={() => deleteClass(item.id, item.name)}
                        >
                          Delete Class
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form className="card" onSubmit={createClass}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Create New Class</h3>

          <div className="form-group">
            <label className="form-label">Class Name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Class Code</label>
            <input className="form-input" required value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Room Name</label>
            <input className="form-input" value={form.roomName} onChange={(e) => setForm((p) => ({ ...p, roomName: e.target.value }))} />
          </div>

          <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
            {saving ? "Creating..." : "Create Class"}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
            {selectedClass ? `Attendance: ${selectedClass.name} (${selectedClass.code})` : "Class Attendance (click class name to view)"}
          </h3>
        </div>
        {loadingAttendance ? (
          <p style={{ color: "var(--text-muted)" }}>Loading attendance...</p>
        ) : selectedClass ? (
          attendanceRows.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No attendance records found for this class.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--text-muted)" }}>Student</th>
                  <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--text-muted)" }}>Status</th>
                  <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--text-muted)" }}>In-Zone Duration</th>
                  <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--text-muted)" }}>Geo</th>
                  <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--text-muted)" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{row.student?.name || "Unknown"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.student?.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{row.status}</td>
                    <td style={{ padding: "12px 14px" }}>{Math.floor((row.durationSeconds || 0) / 60)} mins</td>
                    <td style={{ padding: "12px 14px", color: row.geoStatus ? "var(--success)" : "var(--danger)" }}>
                      {row.geoStatus ? "Inside" : "Out of zone"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Select a class above to inspect attended students.</p>
        )}
      </div>
    </div>
  );
}
