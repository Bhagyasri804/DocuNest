import React from "react";
import { FolderOpen, LogOut, User, Menu, ShieldCheck } from "./icons";

export function Navbar({ user, onLogout, onOpenProfile, onToggleSidebar }) {
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "ADMIN":
        return "badge-admin";
      case "MANAGER":
        return "badge-manager";
      default:
        return "badge-employee";
    }
  };

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className="navbar-brand">
          <div className="brand-icon">
            <FolderOpen size={22} color="#ffffff" />
          </div>
          <span className="brand-text">Docu<span className="brand-accent">Nest</span></span>
        </div>
      </div>

      <div className="navbar-right">
        {user && (
          <div className="navbar-user-section">
            <button className="navbar-user-profile" onClick={onOpenProfile} title="Account Settings">
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name}</span>
                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </button>

            <button className="btn-logout" onClick={onLogout} title="Sign out">
              <LogOut size={18} />
              <span className="logout-text">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
