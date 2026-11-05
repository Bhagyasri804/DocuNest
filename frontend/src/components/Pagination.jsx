import React from "react";
import { ChevronLeft, ChevronRight } from "./icons";

export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      borderTop: "1px solid #e2e8f0",
      backgroundColor: "#fff",
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8
    }}>
      <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
