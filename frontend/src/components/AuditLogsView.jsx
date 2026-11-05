import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Filter } from "./icons";
import { Pagination } from "./Pagination";
import { api } from "../api";

export function AuditLogsView({ onError }) {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("All");
  const [status, setStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [search, action, status, currentPage]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        page: currentPage,
        limit: 15,
        search,
        action,
        status
      });
      setLogs(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      onError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (actionName) => {
    if (actionName.includes("DELETE") || actionName.includes("FAILED")) return "badge-danger";
    if (actionName.includes("UPLOAD") || actionName.includes("RESTORE")) return "badge-success";
    if (actionName.includes("SHARE") || actionName.includes("LOGIN")) return "badge-info";
    return "badge-secondary";
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Security & Compliance Audit Logs</h2>
          <p className="view-subtitle">Immutable trace of user actions, authentication events, and document accesses.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="audit-filters-bar">
        <div className="search-input-wrap" style={{ flex: 2 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search email, action, or details..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="filter-select-wrap">
          <label className="filter-label">Action:</label>
          <select
            className="form-select form-select-sm"
            value={action}
            onChange={(e) => { setAction(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="USER_LOGIN_FAILED">Login Failed</option>
            <option value="USER_LOGOUT">User Logout</option>
            <option value="DOCUMENT_UPLOAD">Document Upload</option>
            <option value="DOCUMENT_DOWNLOAD">Document Download</option>
            <option value="DOCUMENT_UPDATE">Document Update</option>
            <option value="DOCUMENT_DELETE">Document Delete</option>
            <option value="DOCUMENT_SHARE">Document Share</option>
            <option value="DOCUMENT_REVOKE_SHARE">Revoke Share</option>
            <option value="DOCUMENT_VERSION_RESTORE">Version Restore</option>
            <option value="USER_ROLE_CHANGE">Role Change</option>
          </select>
        </div>

        <div className="filter-select-wrap">
          <label className="filter-label">Status:</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
        </div>
      </div>

      <div className="card-table-wrap">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>No audit records match the filters.</div>
        ) : (
          <>
            <table className="app-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor Email</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: "0.85rem" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.user_email || "System"}</td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.entity_type ? `${log.entity_type} #${log.entity_id || ""}` : "-"}
                    </td>
                    <td>
                      <span className={`status-pill ${log.status === "SUCCESS" ? "pill-active" : "pill-inactive"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{log.ip_address || "127.0.0.1"}</td>
                    <td style={{ fontSize: "0.85rem", color: "#475569", maxWidth: 260, wordBreak: "break-word" }}>
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </>
        )}
      </div>
    </div>
  );
}
