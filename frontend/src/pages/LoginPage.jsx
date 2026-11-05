import React, { useState } from "react";
import { FolderOpen, Lock, AlertTriangle, ArrowRight } from "../components/icons";
import { Link, useNavigate } from "../router";
import { api, setToken, setCurrentUser } from "../api";

export function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      if (onLoginSuccess) onLoginSuccess(res.data.user);
      const documentPath = window.location.pathname.match(/^\/documents\/(\d+)\/?$/);
      navigate(documentPath ? `/documents/${documentPath[1]}` : "/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setEmail("bhagyasrinuthalapati@gmail.com");
    setPassword("");
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
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your DocuNest workspace</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertTriangle size={18} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
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

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
