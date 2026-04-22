"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { User, Shield, Eye, CheckCircle, AlertCircle, Loader2, Trash2, Monitor, KeyRound } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  tenant: { universityName: string; domain: string };
}

interface Device {
  id: string;
  deviceId: string;
  lastLogin: string;
  createdAt: string;
}

interface BiometricData {
  embeddings: { id: string; createdAt: string }[];
  isBiometricVerified: boolean;
  count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRadius: "12px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "14px",
      backgroundColor: type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
      color: type === "success" ? "var(--success)" : "var(--danger)",
      border: `1px solid ${type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
    }}>
      {type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {msg}
    </div>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={{ marginBottom: "24px", ...style }}>{children}</div>;
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
      })
      .catch(() => setMsg({ text: "Failed to load profile", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setProfile((p) => p ? { ...p, name: data.user.name } : p);
      setMsg({ text: "Profile updated successfully!", type: "success" });
    } else {
      setMsg({ text: data.error || "Update failed", type: "error" });
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ text: "New passwords do not match", type: "error" });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwMsg({ text: "Password must be at least 8 characters", type: "error" });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg({ text: "Password changed successfully!", type: "success" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPwMsg({ text: data.error || "Password change failed", type: "error" });
    }
    setPwSaving(false);
  };

  const router = useRouter();
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const confirmLabel = profile?.role === "ADMIN" ? "DELETE MY UNIVERSITY" : "DELETE MY ACCOUNT";
  const handleDeleteAccount = async () => {
    if (deletePhrase !== confirmLabel) {
      setDeleteMsg({ text: `Type '${confirmLabel}' in the confirmation field`, type: "error" });
      return;
    }

    if (!confirm(
      profile?.role === "ADMIN"
        ? "This will permanently delete your university, all students, teachers, classes, and attendance records. This cannot be undone. Continue?"
        : "This will permanently delete your account and all related data. This cannot be undone. Continue?"
    )) {
      return;
    }

    setDeleteLoading(true);
    setDeleteMsg(null);

    const res = await fetch("/api/user/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmPhrase: deletePhrase }),
    });
    const data = await res.json();

    if (res.ok) {
      setDeleteMsg({ text: data.message || "Account deleted successfully.", type: "success" });
      await signOut({ callbackUrl: "/" });
      router.push("/");
    } else {
      setDeleteMsg({ text: data.error || "Deletion failed", type: "error" });
    }

    setDeleteLoading(false);
  };

  const roleBadgeColor: Record<string, string> = {
    TEACHER: "#7c3aed",
    ADMIN: "#dc2626",
    STUDENT: "var(--zoom-blue)",
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--zoom-blue)" }} />
    </div>
  );

  return (
    <>
      <SectionCard>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>Account Information</h3>
        {msg && <Toast msg={msg.text} type={msg.type} />}

        {/* Role + University */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <div style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              fontSize: "14px",
              fontWeight: 600,
              color: roleBadgeColor[profile?.role || "STUDENT"] || "var(--text-color)",
              backgroundColor: "var(--bg-color)",
            }}>
              {profile?.role || "—"}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">University</label>
            <input
              type="text"
              className="form-input"
              value={profile?.tenant?.universityName || "—"}
              disabled
              style={{ opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Name (editable) */}
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div className="form-group">
          <label className="form-label">University Email <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>(cannot be changed)</span></label>
          <input
            type="email"
            className="form-input"
            value={profile?.email || ""}
            disabled
            style={{ opacity: 0.7 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn-primary"
            onClick={handleSaveName}
            disabled={saving || name === profile?.name}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {saving ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </SectionCard>

      {/* Change Password */}
      <SectionCard>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <KeyRound size={20} color="var(--zoom-blue)" /> Change Password
        </h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
          Use a strong password of at least 8 characters. Only available for credential-based accounts.
        </p>
        {pwMsg && <Toast msg={pwMsg.text} type={pwMsg.type} />}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={pwSaving}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {pwSaving ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Updating...</> : "Update Password"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Trash2 size={20} color="var(--danger)" /> Permanently Delete Account
        </h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
          This action is irreversible. {profile?.role === "ADMIN" ? "Deleting this account will remove your entire university, all users, classes, sessions, attendance records, and leave requests." : profile?.role === "TEACHER" ? "Deleting this account will remove your teacher profile and all classes you manage, including their sessions and attendance history." : "Deleting this account will remove your student profile and attendance history."}
        </p>
        {deleteMsg && <Toast msg={deleteMsg.text} type={deleteMsg.type} />}
        <div className="form-group">
          <label className="form-label">Confirmation Phrase</label>
          <input
            type="text"
            className="form-input"
            placeholder={`Type ${confirmLabel}`}
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading || deletePhrase !== confirmLabel}
            className="btn-primary"
            style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {deleteLoading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Deleting...</> : "Delete Account"}
          </button>
        </div>
      </SectionCard>
    </>
  );
}

// ─── Tab: Security & Devices ──────────────────────────────────────────────────
function SecurityTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDevices = () => {
    setLoading(true);
    fetch("/api/user/devices")
      .then((r) => r.json())
      .then(setDevices)
      .catch(() => setMsg({ text: "Failed to load devices", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this device? It will need to re-register.")) return;
    setRevoking(id);
    setMsg(null);
    const res = await fetch("/api/user/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: data.message, type: "success" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } else {
      setMsg({ text: data.error || "Revoke failed", type: "error" });
    }
    setRevoking(null);
  };

  const formatDeviceId = (id: string) => {
    // Show truncated fingerprint
    if (id.length > 20) return `${id.slice(0, 8)}…${id.slice(-8)}`;
    return id;
  };

  return (
    <SectionCard>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Monitor size={20} color="var(--zoom-blue)" /> Registered Devices (Anti-Spoofing)
      </h3>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Your account is bound to specific devices for attendance fraud prevention. Only check-ins from registered devices are accepted.
      </p>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--zoom-blue)" }} />
        </div>
      ) : devices.length === 0 ? (
        <div style={{
          padding: "40px",
          textAlign: "center",
          border: "1px dashed var(--border-color)",
          borderRadius: "12px",
          color: "var(--text-muted)",
        }}>
          <Monitor size={36} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontWeight: 500, marginBottom: "6px" }}>No registered devices</p>
          <p style={{ fontSize: "13px" }}>Devices are registered automatically when you check in for the first time.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {devices.map((device, idx) => (
            <div key={device.id} style={{
              padding: "16px 20px",
              border: idx === 0 ? "1px solid var(--success)" : "1px solid var(--border-color)",
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: idx === 0 ? "rgba(0,193,119,0.04)" : "transparent",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>
                    Device {idx + 1}
                    {idx === 0 && (
                      <span style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        backgroundColor: "var(--success)",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontWeight: 700,
                      }}>PRIMARY</span>
                    )}
                  </span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                  ID: {formatDeviceId(device.deviceId)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Registered: {new Date(device.createdAt).toLocaleDateString()} ·
                  Last seen: {new Date(device.lastLogin).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(device.id)}
                disabled={revoking === device.id}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--danger)",
                  backgroundColor: "transparent",
                  color: "var(--danger)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: revoking === device.id ? 0.6 : 1,
                }}
              >
                {revoking === device.id
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <Trash2 size={14} />}
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px", marginTop: "24px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Lost or Replaced Device?</h4>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>
          Revoke your old device above, then check in from your new device to register it automatically.
        </p>
      </div>
    </SectionCard>
  );
}

// ─── Tab: Privacy ─────────────────────────────────────────────────────────────
function PrivacyTab() {
  const [bio, setBio] = useState<BiometricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchBio = () => {
    setLoading(true);
    fetch("/api/user/biometric")
      .then((r) => r.json())
      .then(setBio)
      .catch(() => setMsg({ text: "Failed to load biometric data", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBio(); }, []);

  const handleDelete = async () => {
    if (!confirm("Permanently delete all biometric data? You will need to re-enroll to use face attendance.")) return;
    setDeleting(true);
    setMsg(null);
    const res = await fetch("/api/user/biometric", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: data.message, type: "success" });
      fetchBio(); // refresh
    } else {
      setMsg({ text: data.error || "Deletion failed", type: "error" });
    }
    setDeleting(false);
  };

  return (
    <SectionCard>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Biometric Data Management</h3>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Smart Campus stores only a 128-dimensional mathematical embedding — no photographs are retained. Embeddings cannot be reverse-engineered into a face image.
      </p>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--zoom-blue)" }} />
        </div>
      ) : bio && bio.count > 0 ? (
        <>
          <div style={{
            padding: "16px 20px",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>Stored Biometric Vectors</span>
              <span style={{
                fontSize: "11px",
                backgroundColor: bio.isBiometricVerified ? "var(--success)" : "var(--warning)",
                color: "white",
                padding: "3px 10px",
                borderRadius: "12px",
                fontWeight: 700,
              }}>
                {bio.isBiometricVerified ? "VERIFIED" : "NOT VERIFIED"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bio.embeddings.map((e) => (
                <div key={e.id} style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  ID: {e.id.slice(0, 12)}… · Enrolled: {new Date(e.createdAt).toLocaleDateString()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--danger)", marginBottom: "8px" }}>
              Right to be Forgotten (GDPR / FERPA)
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Permanently deletes all biometric embeddings from our servers. This action is irreversible. You will lose the ability to mark attendance until you complete re-enrollment.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-primary"
              style={{ backgroundColor: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}
            >
              {deleting
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Deleting...</>
                : <><Trash2 size={16} /> Delete All Biometric Data</>}
            </button>
          </div>
        </>
      ) : (
        <div style={{
          padding: "40px",
          textAlign: "center",
          border: "1px dashed var(--border-color)",
          borderRadius: "12px",
          color: "var(--text-muted)",
        }}>
          <Eye size={36} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontWeight: 500, marginBottom: "6px" }}>No biometric data stored</p>
          <p style={{ fontSize: "13px" }}>Complete the face onboarding to enroll your biometric profile.</p>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    // Security & Devices + Privacy are student-only (anti-spoofing & biometrics don't apply to teachers/admins)
    ...(userRole === "STUDENT" ? [
      { id: "security", label: "Security & Devices", icon: Shield },
      { id: "privacy", label: "Privacy (GDPR/FERPA)", icon: Eye },
    ] : []),
  ];

  return (
    <div style={{ maxWidth: "820px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2 className="page-title">Settings & Privacy</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
            Manage your account, registered devices, and biometric privacy.
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-color)", marginBottom: "32px" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 18px",
              fontWeight: 600,
              fontSize: "14px",
              color: activeTab === id ? "var(--zoom-blue)" : "var(--text-muted)",
              transition: "color 0.2s",
              background: "none",
              borderTopWidth: 0,
              borderLeftWidth: 0,
              borderRightWidth: 0,
              borderBottomWidth: "2px",
              borderBottomStyle: "solid",
              borderBottomColor: activeTab === id ? "var(--zoom-blue)" : "transparent",
              cursor: "pointer",
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "privacy" && <PrivacyTab />}
    </div>
  );
}
