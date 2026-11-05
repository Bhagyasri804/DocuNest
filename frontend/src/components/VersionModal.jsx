import React, { useState, useEffect } from "react";
import { History, X, Upload, Download, RefreshCw, FileText } from "./icons";
import { api } from "../api";
import { formatFileSize } from "../utils/formatFileSize";

export function VersionModal({ isOpen, doc, currentUser, onClose, onSuccess, onError }) {
  const [versions, setVersions] = useState([]);
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (isOpen && doc) {
      loadVersions();
    }
  }, [isOpen, doc]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await api.getDocumentVersions(doc.id);
      setVersions(res.data || []);
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!file) {
      onError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("comment", comment);

      const res = await api.uploadNewVersion(doc.id, formData);
      onSuccess(res.message || "New version uploaded successfully!");
      setFile(null);
      setComment("");
      loadVersions();
    } catch (err) {
      onError(err.message || "Failed to upload new version.");
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore Version ${version.version_number} as the active latest version?`)) return;

    setRestoringId(version.id);
    try {
      const res = await api.restoreVersion(doc.id, version.id);
      onSuccess(res.message || `Restored version ${version.version_number}.`);
      loadVersions();
    } catch (err) {
      onError(err.message || "Failed to restore version.");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDownloadVersion = (version) => {
    window.open(api.getVersionDownloadUrl(doc.id, version.id), "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container version-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <History size={20} color="#2563eb" />
            <h3 style={{ maxWidth: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Version Control: {doc?.title}
            </h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Upload New Version Section */}
        <form onSubmit={handleUploadVersion} className="version-upload-form">
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#334155" }}>
            Upload Newer Revision
          </h4>
          <div className="form-row" style={{ gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input
                type="file"
                className="form-input"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>
            <div style={{ flex: 1.5 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Change notes or revision summary..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              <Upload size={16} /> {uploading ? "Uploading..." : "Upload Revision"}
            </button>
          </div>
        </form>

        {/* Version History List */}
        <div className="version-history-section">
          <h4 style={{ fontSize: "0.95rem", color: "#334155", margin: "20px 0 12px 0" }}>
            Revision Timeline ({versions.length})
          </h4>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading history...</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>No revisions found.</div>
          ) : (
            <div className="version-list">
              {versions.map((v, idx) => (
                <div key={v.id} className="version-card">
                  <div className="version-badge-col">
                    <span className={`version-num-pill ${idx === 0 ? "pill-latest" : ""}`}>
                      v{v.version_number} {idx === 0 && "(Active)"}
                    </span>
                  </div>
                  <div className="version-info-col">
                    <div className="version-comment">{v.comment || "Revision upload"}</div>
                    <div className="version-meta">
                      <span>By <strong>{v.uploader_name}</strong></span>
                      <span>•</span>
                      <span>{new Date(v.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>{formatFileSize(v.file_size)}</span>
                    </div>
                  </div>
                  <div className="version-actions-col">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadVersion(v)}
                      title="Download this version"
                    >
                      <Download size={15} /> Download
                    </button>
                    {idx !== 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRestore(v)}
                        disabled={restoringId === v.id}
                        title="Restore this version as active"
                      >
                        <RefreshCw size={15} /> {restoringId === v.id ? "Restoring..." : "Restore"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
