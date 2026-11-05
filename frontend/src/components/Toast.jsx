import React from "react";
import { CheckCircle2, AlertTriangle, X } from "./icons";

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        borderRadius: 8,
        backgroundColor: isError ? "#fef2f2" : "#f0fdf4",
        border: `1px solid ${isError ? "#f87171" : "#86efac"}`,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        color: isError ? "#991b1b" : "#166534",
        fontSize: "0.9rem",
        fontWeight: 500,
        maxWidth: 420,
        animation: "slideInRight 0.25s ease-out",
      }}
    >
      {isError ? <AlertTriangle size={20} color="#dc2626" /> : <CheckCircle2 size={20} color="#16a34a" />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          color: "inherit",
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
