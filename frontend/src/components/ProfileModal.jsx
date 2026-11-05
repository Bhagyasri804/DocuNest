import React, { useState } from "react";
import { User, X, Key, ShieldCheck, CheckCircle2, AlertTriangle } from "./icons";
import { api, setCurrentUser } from "../api";

export function ProfileModal({ isOpen, user, onClose, onUserUpdated, onSuccess, onError }) {
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdatingProfile(true);
    try {
      const res = await api.updateProfile(name.trim());
      setCurrentUser(res.data);
      onUserUpdated(res.data);
      onSuccess("Profile name updated successfully!");
    } catch (err) {
      onError(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      onError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      onError("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      onSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      onError(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <User size={20} color="#2563eb" />
            <h3>User Account Settings</h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-badge-summary">
          <div className="profile-large-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="profile-summary-text">
            <h4>{user?.name}</h4>
            <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{user?.email}</span>
            <div style={{ marginTop: 4 }}>
              <span className={`role-badge badge-${user?.role?.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Update Profile Name */}
        <form onSubmit={handleUpdateProfile} className="profile-section-form">
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#334155" }}>
            Personal Details
          </h4>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address (Immutable)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ""}
              disabled
              style={{ backgroundColor: "#f8fafc", color: "#64748b" }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={updatingProfile}>
            {updatingProfile ? "Saving..." : "Save Details"}
          </button>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="profile-section-form">
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#334155" }}>
            Security & Password
          </h4>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 8 characters, letter & number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={updatingPassword}>
            <Key size={15} /> {updatingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
