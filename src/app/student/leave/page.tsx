"use client";

import { useState } from "react";

export default function LeavePortal() {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate uploading to MinIO/S3 and writing to DB
    setStatusMessage("Uploading document and submitting request...");
    setTimeout(() => {
      setStatusMessage("Leave request submitted successfully. Pending Admin approval.");
      setReason("");
      setDate("");
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="page-title">Leave & Excuse Portal</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Submit an official absence request. Approved requests will restore your attendance streak.
          </p>
        </div>
      </div>

      <div className="card">
        {statusMessage && (
          <div style={{ padding: '12px', backgroundColor: statusMessage.includes("success") ? 'rgba(0, 193, 119, 0.1)' : 'var(--zoom-light-bg)', color: statusMessage.includes("success") ? 'var(--success)' : 'var(--zoom-blue)', borderRadius: '8px', marginBottom: '24px', fontWeight: 500 }}>
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Date of Absence</label>
            <input 
              type="date" 
              className="form-input" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Reason</label>
            <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="" disabled>Select a reason...</option>
              <option value="medical">Medical / Sick Leave</option>
              <option value="emergency">Family Emergency</option>
              <option value="event">University Sponsored Event</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Supporting Document (PDF/Image)</label>
            <div style={{ padding: '24px', border: '2px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', backgroundColor: 'var(--bg-color)', cursor: 'pointer' }}>
              <span style={{ color: 'var(--zoom-blue)', fontWeight: 500 }}>Click to upload</span> or drag and drop
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Max file size: 5MB</p>
            </div>
            <input type="file" style={{ display: 'none' }} />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
            Submit Request
          </button>
        </form>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>My Previous Requests</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
           <li style={{ padding: '16px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Oct 10, 2026 - Medical</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Attached: doctor_note.pdf</div>
              </div>
              <span style={{ fontSize: '12px', backgroundColor: 'var(--warning)', color: 'white', padding: '4px 8px', borderRadius: '12px' }}>Pending</span>
           </li>
        </ul>
      </div>
    </div>
  );
}
