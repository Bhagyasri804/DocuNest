import React from "react";
import { 
  FileText, 
  Download, 
  Share2, 
  History, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Star, 
  Eye,
  Calendar,
  User,
  HardDrive
} from "./icons";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DocumentCard({
  doc,
  currentUser,
  onView,
  onEdit,
  onDelete,
  onShare,
  onVersions,
  onToggleFavorite,
  onDownload
}) {
  const isOwner = currentUser?.id === doc.user_id;
  const isAdmin = currentUser?.role === "ADMIN";
  const canManage = isOwner || isAdmin;
  const permission = doc.access_permission || doc.permission || (canManage ? "OWNER" : "VIEW");
  const canEdit = canManage || permission === "EDIT";
  const canDownload = canManage || permission === "DOWNLOAD" || permission === "EDIT";

  return (
    <div className="document-card">
      <div className="doc-card-header">
        <div className="doc-type-icon">
          <FileText size={22} color="#2563eb" />
        </div>
        <div className="doc-badges">
          <span className="doc-category-badge">{doc.category || "General"}</span>
          <span className="doc-version-badge">v{doc.version || 1}</span>
        </div>
        <button
          className={`btn-favorite ${doc.is_favorite ? "is-favorite" : ""}`}
          onClick={() => onToggleFavorite(doc.id)}
          title={doc.is_favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star size={18} fill={doc.is_favorite ? "#f59e0b" : "none"} color={doc.is_favorite ? "#f59e0b" : "#94a3b8"} />
        </button>
      </div>

      <div className="doc-card-body" onClick={() => onView(doc)}>
        <h4 className="doc-title" title={doc.title}>
          {doc.title}
        </h4>
        {doc.description && (
          <p className="doc-description">{doc.description}</p>
        )}

        {doc.tags && doc.tags.length > 0 && (
          <div className="doc-tags-list">
            {doc.tags.map((tag, i) => (
              <span key={i} className="doc-tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="doc-meta-info">
          <div className="meta-item" title="File Size">
            <HardDrive size={14} />
            <span>{formatBytes(doc.file_size)}</span>
          </div>
          <div className="meta-item" title="Updated Date">
            <Calendar size={14} />
            <span>{formatDate(doc.updated_at || doc.created_at)}</span>
          </div>
          {doc.owner_name && (
            <div className="meta-item" title="Owner">
              <User size={14} />
              <span>{isOwner ? "You" : doc.owner_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="doc-card-footer">
        <div className="doc-actions-left">
          <button className="btn-icon" onClick={() => onView(doc)} title="View Details & Comments">
            <Eye size={16} />
          </button>
          {canDownload && (
            <button className="btn-icon" onClick={() => onDownload(doc)} title="Download Document">
              <Download size={16} />
            </button>
          )}
          <button className="btn-icon" onClick={() => onVersions(doc)} title="Version History">
            <History size={16} />
          </button>
          {canManage && (
            <button className="btn-icon" onClick={() => onShare(doc)} title="Share & Permissions">
              <Share2 size={16} />
            </button>
          )}
        </div>

        <div className="doc-actions-right">
          {canEdit && (
            <button className="btn-icon" onClick={() => onEdit(doc)} title="Edit Metadata">
              <Edit3 size={16} />
            </button>
          )}
          {canManage && (
            <button className="btn-icon btn-icon-danger" onClick={() => onDelete(doc)} title="Delete Document">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
