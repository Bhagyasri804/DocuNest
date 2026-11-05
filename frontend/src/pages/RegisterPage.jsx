import React, { useState } from "react";
import { FolderOpen, Lock, AlertTriangle, CheckCircle2 } from "../components/icons";
import { Link, useNavigate } from "../router";
import { api, setToken, setCurrentUser } from "../api";

export function RegisterPage({ onLoginSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isValidPassword = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please provide a valid work email.");
      return;
    }
    if (!isValidPassword) {
      setError("Password does not meet the security criteria.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(name.trim(), email.trim(), password);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      if (onLoginSuccess) onLoginSuccess(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-icon">
              <FolderOpen size={24} color="#ffffff" />
            </div>
            <span className="brand-text">Docu<span className="brand-accent">Nest</span></span>
          </div>
          <h2 className="auth-title">Create Workspace Account</h2>
          <p className="auth-subtitle">Join DocuNest for secure document management</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertTriangle size={18} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sarah Connor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="sarah@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Password Validation Checklist */}
          <div className="password-checklist">
            <div className={`checklist-item ${hasMinLength ? "item-valid" : ""}`}>
              <CheckCircle2 size={14} color={hasMinLength ? "#16a34a" : "#cbd5e1"} />
              <span>At least 8 characters</span>
            </div>
            <div className={`checklist-item ${hasLetter ? "item-valid" : ""}`}>
              <CheckCircle2 size={14} color={hasLetter ? "#16a34a" : "#cbd5e1"} />
              <span>At least one letter (a-z)</span>
            </div>
            <div className={`checklist-item ${hasNumber ? "item-valid" : ""}`}>
              <CheckCircle2 size={14} color={hasNumber ? "#16a34a" : "#cbd5e1"} />
              <span>At least one number (0-9)</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || !isValidPassword}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
