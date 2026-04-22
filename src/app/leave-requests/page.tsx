"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ClipboardList, 
  Send, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  User, 
  ChevronRight,
  FileText,
  CalendarDays,
  CheckCircle,
  X
} from "lucide-react";

export default function LeaveRequestsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  
  // Teacher State
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Student Form State
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    classCode: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!userRole) {
      router.push("/auth/signin");
      return;
    }
    if (userRole === "ADMIN") {
      router.push("/analytics");
      return;
    }
    fetchRequests();
  }, [status, userRole, router]);

  const fetchRequests = async () => {
    try {
      const endpoint = userRole === "TEACHER" ? "/api/teacher/leave" : "/api/student/leave";
      const res = await fetch(endpoint);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leave requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/student/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setMessage("Leave request submitted successfully!");
        setFormData({ startDate: "", endDate: "", reason: "", classCode: "" });
        fetchRequests(); // Refresh history
        setActiveTab("history");
      } else {
        const error = await res.json();
        setMessage(error.error || "Submission failed");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeacherAction = async (id: string, status: string) => {
    try {
      await fetch(`/api/teacher/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchRequests();
    } catch (err) {
      console.error("Action failed");
    }
  };

  const StatusPill = ({ status }: { status: string }) => {
    const config: Record<string, { icon: any, className: string }> = {
      PENDING: { icon: Clock, className: "status-pill-pending" },
      APPROVED: { icon: CheckCircle2, className: "status-pill-approved" },
      REJECTED: { icon: XCircle, className: "status-pill-rejected" }
    };

    const { icon: Icon, className } = config[status] || config.PENDING;

    return (
      <span className={`status-pill ${className}`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (userRole === "TEACHER") {
    return (
      <div className="animate-in">
        <div className="page-header" style={{ marginBottom: '32px' }}>
          <div>
            <h2 className="page-title" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>Leave Resolution Desk</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>
              Review student absence requests. Approving a request will automatically excuse past absences.
            </p>
          </div>
          <div style={{ 
            backgroundColor: 'var(--premium-blue-soft)', 
            padding: '8px 16px', 
            borderRadius: '12px',
            color: 'var(--premium-blue)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            {requests.filter(r => r.status === 'PENDING').length} Pending Actions
          </div>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {isLoading ? (
             <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock className="animate-spin" style={{ margin: '0 auto 12px' }} />
                Loading requests...
             </div>
          ) : requests.length === 0 ? (
            <div className="card" style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: 'transparent', borderStyle: 'dashed' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(0,0,0,0.03)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--text-muted)'
              }}>
                <ClipboardList size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No requests found</h3>
              <p style={{ color: 'var(--text-muted)' }}>Everything is caught up! No student leave requests are pending.</p>
            </div>
          ) : (
            requests.map((req, idx) => (
              <div key={req.id} className="leave-card animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px', 
                      backgroundColor: 'var(--premium-purple-soft)',
                      color: 'var(--premium-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '4px' }}>{req.student?.name || "Unknown Student"}</h4>
                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarDays size={14} />
                          {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FileText size={14} />
                          {req.reason}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ChevronRight size={14} />
                          {req.class?.name || "Unknown Class"} ({req.class?.code || "N/A"})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <StatusPill status={req.status} />
                    {req.status === "PENDING" && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleTeacherAction(req.id, "REJECTED")} 
                          className="btn-primary" 
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '13px', 
                            backgroundColor: 'white', 
                            color: 'var(--premium-red)',
                            border: '1px solid var(--premium-red-soft)',
                            boxShadow: 'none'
                          }}
                        >
                          <X size={16} /> Reject
                        </button>
                        <button 
                          onClick={() => handleTeacherAction(req.id, "APPROVED")} 
                          className="btn-primary" 
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '13px', 
                            backgroundColor: 'var(--premium-green)',
                            color: 'white'
                          }}
                        >
                          <CheckCircle size={16} /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Student View
  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>Personal Leave Portal</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>
            Submit and track your absence requests. All requests are reviewed by institutional faculty.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="tab-nav" style={{ marginBottom: '32px' }}>
          <button 
            onClick={() => setActiveTab("submit")}
            className={`tab-nav-item ${activeTab === "submit" ? "active" : ""}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={16} /> New Request
            </div>
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`tab-nav-item ${activeTab === "history" ? "active" : ""}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ClipboardList size={16} /> History
            </div>
          </button>
        </div>

        {activeTab === "submit" ? (
          <div className="card animate-slide-up" style={{ padding: '32px' }}>
            <form onSubmit={handleLeaveSubmit}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ color: 'var(--text-color)', fontWeight: 600 }}>Class Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS101"
                  value={formData.classCode}
                  onChange={(e) => setFormData({ ...formData, classCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--text-color)', fontWeight: 600 }}>Start Date</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required 
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--text-color)', fontWeight: 600 }}>End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label" style={{ color: 'var(--text-color)', fontWeight: 600 }}>Reason for Absence</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '140px', resize: 'vertical', paddingTop: '12px' }}
                  placeholder="Please provide a detailed explanation for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </div>
              
              {message && (
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: message.includes("success") ? 'var(--premium-green-soft)' : 'var(--premium-red-soft)',
                  color: message.includes("success") ? 'var(--premium-green)' : 'var(--premium-red)',
                  border: `1px solid ${message.includes("success") ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  {message.includes("success") ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  {message}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', height: '48px', fontSize: '16px' }} 
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {isLoading ? (
               <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading your history...
               </div>
            ) : requests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                No past requests found. Your leave history will appear here.
              </div>
            ) : (
              requests.map((req, idx) => (
                <div key={req.id} className="leave-card animate-slide-up" style={{ animationDelay: `${idx * 0.05}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--premium-blue-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--premium-blue)'
                    }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{req.reason}</h4>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarDays size={14} /> 
                          {new Date(req.startDate).toLocaleDateString()}
                        </span>
                        <ChevronRight size={12} />
                        <span>{new Date(req.endDate).toLocaleDateString()}</span>
                        <ChevronRight size={12} />
                        <span>{req.class?.name || "Unknown Class"} ({req.class?.code || "N/A"})</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <StatusPill status={req.status} />
                     <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                       Submitted on {new Date(req.createdAt).toLocaleDateString()}
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
