import { FolderOpen, LogOut, Menu, X } from "./icons";
import { getUserInitials } from "../utils/userInitials";

export function Navbar({ user, onLogout, onOpenProfile, onToggleSidebar, isSidebarOpen }) {
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
        <button
          id="navbar-menu-btn"
          className="navbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isSidebarOpen}
          aria-controls="workspace-sidebar"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
                {getUserInitials(user.name)}
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
