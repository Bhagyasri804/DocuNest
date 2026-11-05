import React from "react";
import { 
  FolderOpen, 
  FileText, 
  Share2, 
  History, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2 
} from "../components/icons";
import { Link, useNavigate } from "../router";
import { getCurrentUser } from "../api";

export function LandingPage() {
  const user = getCurrentUser();
  const navigate = useNavigate();

  return (
    <div className="landing-page-wrap">
      {/* Landing Navbar */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-brand">
            <div className="brand-icon">
              <FolderOpen size={22} color="#ffffff" />
            </div>
            <span className="brand-text">Docu<span className="brand-accent">Nest</span></span>
          </div>

          <div className="landing-nav-links">
            {user ? (
              <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-link">Sign In</Link>
                <Link to="/register" className="btn btn-primary">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content">
          <div className="hero-pill">
            <ShieldCheck size={16} color="#2563eb" />
            <span>Enterprise-Grade Document Management</span>
          </div>
          <h1 className="hero-headline">
            Centralize, Collaborate, and Control Your Organization's Documents
          </h1>
          <p className="hero-subtext">
            DocuNest gives your team a secure, unified workspace with role-based permissions, automated version control, contextual discussions, and audit tracking.
          </p>

          <div className="hero-cta-group">
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/dashboard")}>
                Open Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Your Workspace <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign In to Account
                </Link>
              </>
            )}
          </div>

          <div className="hero-trust-badges">
            <div className="trust-item"><CheckCircle2 size={16} color="#16a34a" /> 256-bit Token Security</div>
            <div className="trust-item"><CheckCircle2 size={16} color="#16a34a" /> Granular Access Roles</div>
            <div className="trust-item"><CheckCircle2 size={16} color="#16a34a" /> Immutable Audit Trail</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features-section">
        <div className="section-header">
          <span className="section-eyebrow">CAPABILITIES</span>
          <h2 className="section-title">Built for High-Trust Professional Workflows</h2>
          <p className="section-subtitle">Everything modern teams need to manage confidential documents without chaos.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ backgroundColor: "#eff6ff" }}>
              <FileText size={24} color="#2563eb" />
            </div>
            <h3>Smart Document Storage</h3>
            <p>Upload PDFs, Word docs, spreadsheets, slides, and images with automatic metadata tagging and rapid search.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ backgroundColor: "#f0fdf4" }}>
              <Share2 size={24} color="#16a34a" />
            </div>
            <h3>Role-Based Sharing</h3>
            <p>Grant exact VIEW, DOWNLOAD, or EDIT permissions to specific team members and revoke access anytime.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ backgroundColor: "#faf5ff" }}>
              <History size={24} color="#9333ea" />
            </div>
            <h3>Version Control & Rollback</h3>
            <p>Maintain complete revision history with uploader notes and seamlessly restore any previous version.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ backgroundColor: "#fff7ed" }}>
              <ShieldCheck size={24} color="#ea580c" />
            </div>
            <h3>Audit Logging</h3>
            <p>Admins maintain complete visibility with tamper-proof event logs for downloads, edits, shares, and logins.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <FolderOpen size={18} color="#2563eb" />
            <strong>DocuNest</strong>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} DocuNest System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
