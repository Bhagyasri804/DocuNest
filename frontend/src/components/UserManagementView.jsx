import React, { useState, useEffect } from "react";
import { Users, Search, ShieldCheck } from "./icons";
import { api } from "../api";

export function UserManagementView({ currentUser, onSuccess, onError }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers(search);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      onError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      onSuccess(`User role updated to ${newRole}.`);
      loadUsers();
    } catch (err) {
      onError(err.message || "Failed to update user role.");
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await api.updateUserStatus(userId, newStatus);
      onSuccess(`User status updated to ${newStatus}.`);
      loadUsers();
    } catch (err) {
      onError(err.message || "Failed to update user status.");
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>User Management</h2>
          <p className="view-subtitle">Manage organization accounts, role-based access controls, and statuses.</p>
        </div>
        <div className="view-header-actions">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-table-wrap">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>No users found matching query.</div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="table-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{u.name}</div>
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 500 }}>(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "#64748b" }}>{u.email}</td>
                  <td>
                    {isAdmin && u.id !== currentUser?.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="EMPLOYEE">EMPLOYEE</option>
                      </select>
                    ) : (
                      <span className={`role-badge badge-${u.role?.toLowerCase()}`}>{u.role}</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill pill-${u.status?.toLowerCase()}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      {u.id !== currentUser?.id && (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {u.status === "ACTIVE" ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStatusChange(u.id, "INACTIVE")}
                              title="Deactivate Account"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStatusChange(u.id, "ACTIVE")}
                              title="Activate Account"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
