import React from "react";
import { getCurrentUser } from "../api";
import { Navigate } from "../router";

export function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("docunest_token");
  const user = getCurrentUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2>Access Restricted</h2>
        <p style={{ color: "#64748b" }}>You do not have permission to access this area.</p>
        <a href="/dashboard" className="btn btn-primary" style={{ display: "inline-block", marginTop: 16 }}>
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children;
}
