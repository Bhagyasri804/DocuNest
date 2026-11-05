import React, { useState, useEffect } from "react";
import { Share2, X, Trash2, ShieldCheck, User } from "./icons";
import { api } from "../api";

export function ShareModal({ isOpen, doc, onClose, onSuccess, onError }) {
  const [shares, setShares] = useState([]);
  const [targetEmail, setTargetEmail] = useState("");
  const [permission, setPermission] = useState("VIEW");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (isOpen && doc) {
      loadShares();
    }
  }, [isOpen, doc]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const res = await api.getDocumentShares(doc.id);
      setShares(res.data || []);
    } catch (err) {
      console.error("Failed to load shares:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!targetEmail.trim()) {
      onError("Please enter the collaborator's email.");
      return;
    }

    setSharing(true);
    try {
      const res = await api.shareDocument(doc.id, {
        target_email: targetEmail.trim(),
        permission,
      });
      onSuccess(res.message || "Document shared successfully!");
      setTargetEmail("");
      loadShares();
    } catch (err) {
      onError(err.message || "Failed to share document.");
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm("Revoke this collaborator's access?")) return;
    try {
      await api.revokeShare(doc.id, shareId);
      onSuccess("Access revoked.");
      loadShares();
    } catch (err) {
      onError(err.message || "Failed to revoke access.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Share2 size={20} color="#2563eb" />
            <h3 style={{ maxWidth: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Share & Permissions: {doc?.title}
            </h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleShare} className="share-add-form">
          <div className="form-row" style={{ alignItems: "flex-end", gap: 12 }}>
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label className="form-label">Collaborator Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="colleague@company.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Permission</label>
              <select
                className="form-select"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="VIEW">View Only</option>
                <option value="DOWNLOAD">Download</option>
                <option value="EDIT">Full Edit</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={sharing} style={{ height: 42 }}>
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>

        <div className="shares-list-section">
          <h4 style={{ fontSize: "0.95rem", color: "#334155", margin: "20px 0 12px 0" }}>
            Current Collaborators ({shares.length})
          </h4>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading shares...</div>
          ) : shares.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
              This document is not shared with anyone yet.
            </div>
          ) : (
            <div className="shares-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Permission</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="table-avatar">{s.user_name?.charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: 500 }}>{s.user_name}</span>
                        </div>
                      </td>
                      <td style={{ color: "#64748b" }}>{s.user_email}</td>
                      <td>
                        <span className={`badge-perm perm-${s.permission.toLowerCase()}`}>
                          {s.permission}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleRevoke(s.id)}
                          title="Revoke Access"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
