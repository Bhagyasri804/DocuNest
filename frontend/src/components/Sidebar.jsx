import React from "react";
import { 
  FileText, 
  BarChart3, 
  Share2, 
  FolderOpen, 
  Tag, 
  Users, 
  ShieldCheck, 
  Plus,
  Clock,
  FileCheck
} from "./icons";

export function Sidebar({ currentView, setCurrentView, user, onOpenUpload, isOpen, onCloseMobile, pendingCount = 0 }) {
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER" || isAdmin;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "documents", label: "All Documents", icon: FileText },
    ...(isManager ? [{ id: "approvals", label: "Approvals", icon: FileCheck, count: pendingCount }] : []),
    { id: "shared", label: "Shared With Me", icon: Share2 },
    { id: "categories", label: "Categories", icon: FolderOpen },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    ...(isManager ? [{ id: "users", label: "User Management", icon: Users }] : []),
    ...(isAdmin ? [{ id: "audit-logs", label: "Audit Logs", icon: ShieldCheck }] : []),
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {isOpen && <div className="sidebar-mobile-overlay" onClick={onCloseMobile} />}
      <aside className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-upload-wrap">
          <button className="btn btn-primary btn-upload-doc" onClick={onOpenUpload}>
            <Plus size={18} />
            <span>New Document</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">WORKSPACE</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count > 0 && (
                  <span className="sidebar-count-badge">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className="status-dot"></span>
            <span>DocuNest Enterprise 2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
