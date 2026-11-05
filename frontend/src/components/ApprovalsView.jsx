import React, { useState, useEffect } from "react";
import { FileCheck, Search, Eye, CheckCircle, XCircle, Clock, User } from "./icons";
import { api } from "../api";

export function ApprovalsView({ onReviewDoc, onViewDoc, onError }) {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingApprovals();
      setPendingDocs(res.data || []);
    } catch (err) {
      console.error("Failed to load pending approvals:", err);
      if (onError) onError("Failed to load pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = pendingDocs.filter((d) => {
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      d.title.toLowerCase().includes(query) ||
      d.owner_name?.toLowerCase().includes(query) ||
      d.category?.toLowerCase().includes(query) ||
      d.submission_notes?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Document Approvals</h2>
          <p className="view-subtitle">
            Review, approve, or reject documents submitted by organization members.
          </p>
        </div>
        <div className="view-header-actions">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Filter by title, owner, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-table-wrap">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
            Loading pending approvals...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "#94a3b8" }}>
            <FileCheck size={48} style={{ margin: "0 auto 12px auto", opacity: 0.4 }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>All Caught Up!</h3>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>There are currently no documents pending manager or admin approval.</p>
          </div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Submitted By</th>
                <th>Submitted Date</th>
                <th>Notes</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{doc.title}</div>
                    <div style={{ fontSize: "0.775rem", color: "#64748b" }}>v{doc.version || 1} • {doc.original_file_name || doc.file_name}</div>
                  </td>
                  <td>
                    <span className="doc-category-badge">{doc.category || "General"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="table-avatar">{doc.owner_name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{doc.owner_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{doc.owner_email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {doc.submitted_at ? new Date(doc.submitted_at).toLocaleString() : new Date(doc.updated_at).toLocaleString()}
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "#475569", maxWidth: 220 }}>
                    {doc.submission_notes ? `"${doc.submission_notes}"` : <span style={{ color: "#94a3b8" }}>None</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDoc(doc)}
                        title="View Document Details"
                      >
                        <Eye size={15} /> View
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onReviewDoc(doc, "approve")}
                        title="Review and Approve Document"
                        style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                      >
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onReviewDoc(doc, "reject")}
                        title="Review and Reject Document"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
