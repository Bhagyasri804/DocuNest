import React, { useState } from "react";
import { FileCheck, X, CheckCircle, XCircle, AlertTriangle, SendHorizontal } from "./icons";
import { api } from "../api";

export function ApprovalModal({
  isOpen,
  mode = "submit", // "submit" | "review"
  doc,
  onClose,
  onSuccess,
  onError
}) {
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [decision, setDecision] = useState("approve"); // "approve" | "reject"
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  if (!isOpen || !doc) return null;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (mode === "submit") {
      setLoading(true);
      try {
        const res = await api.submitForApproval(doc.id, comments);
        onSuccess(res.message || "Document submitted for approval successfully.");
        onClose();
      } catch (err) {
        onError(err.message || "Failed to submit document for approval.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Review Mode
    if (decision === "reject") {
      if (!rejectionReason.trim()) {
        setValidationError("A rejection reason is required to reject this document.");
        return;
      }

      setLoading(true);
      try {
        const res = await api.rejectDocument(doc.id, rejectionReason.trim());
        onSuccess(res.message || "Document has been rejected.");
        onClose();
      } catch (err) {
        onError(err.message || "Failed to reject document.");
      } finally {
        setLoading(false);
      }
    } else {
      // Approve
      setLoading(true);
      try {
        const res = await api.approveDocument(doc.id, comments);
        onSuccess(res.message || "Document approved successfully.");
        onClose();
      } catch (err) {
        onError(err.message || "Failed to approve document.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container approval-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FileCheck size={20} color={mode === "submit" ? "#2563eb" : "#16a34a"} />
            <h3 style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mode === "submit" ? "Submit for Approval" : "Document Approval Review"}
            </h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmitReview}>
          <div className="approval-modal-doc-summary">
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "1rem", marginBottom: 4 }}>
              {doc.title}
            </div>
            <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
              Category: <strong>{doc.category || "General"}</strong> • Version: <strong>v{doc.version || 1}</strong>
            </div>
          </div>

          {validationError && (
            <div className="auth-error-alert" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span>{validationError}</span>
            </div>
          )}

          {mode === "submit" ? (
            <div className="form-group">
              <label className="form-label">Submission Notes (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add any notes for the manager or admin reviewing this document..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Once submitted, managers and admins will be able to review and approve or reject this document.
              </p>
            </div>
          ) : (
            <>
              <div className="approval-decision-selector" style={{ marginBottom: 18 }}>
                <label className="form-label">Review Decision *</label>
                <div style={{ display: "flex", gap: 12 }}>
                  <label
                    className={`decision-option-card ${decision === "approve" ? "decision-selected-approve" : ""}`}
                    onClick={() => { setDecision("approve"); setValidationError(""); }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      checked={decision === "approve"}
                      onChange={() => setDecision("approve")}
                      style={{ display: "none" }}
                    />
                    <CheckCircle size={18} color="#16a34a" />
                    <span style={{ fontWeight: 600 }}>Approve</span>
                  </label>

                  <label
                    className={`decision-option-card ${decision === "reject" ? "decision-selected-reject" : ""}`}
                    onClick={() => { setDecision("reject"); setValidationError(""); }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      checked={decision === "reject"}
                      onChange={() => setDecision("reject")}
                      style={{ display: "none" }}
                    />
                    <XCircle size={18} color="#dc2626" />
                    <span style={{ fontWeight: 600 }}>Reject</span>
                  </label>
                </div>
              </div>

              {decision === "reject" ? (
                <div className="form-group">
                  <label className="form-label" style={{ color: "#b91c1c" }}>
                    Rejection Reason * (Required)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Specify why this document was rejected and what changes are required..."
                    value={rejectionReason}
                    onChange={(e) => { setRejectionReason(e.target.value); setValidationError(""); }}
                    required
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    The owner will see this rejection reason so they can update the document and re-submit.
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Approval Comments (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Add any sign-off remarks or guidance..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${
                mode === "submit"
                  ? "btn-primary"
                  : decision === "reject"
                  ? "btn-danger"
                  : "btn-primary"
              }`}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : mode === "submit"
                ? "Submit for Approval"
                : decision === "reject"
                ? "Reject Document"
                : "Approve Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
