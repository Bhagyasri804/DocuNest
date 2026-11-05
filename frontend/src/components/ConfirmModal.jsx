import React from "react";
import { AlertTriangle } from "./icons";

export function ConfirmModal({ isOpen, title, message, confirmText = "Confirm", confirmVariant = "danger", onConfirm, onCancel, loading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: confirmVariant === "danger" ? "#fee2e2" : "#e0f2fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <AlertTriangle size={22} color={confirmVariant === "danger" ? "#dc2626" : "#0284c7"} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "#0f172a" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${confirmVariant === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
