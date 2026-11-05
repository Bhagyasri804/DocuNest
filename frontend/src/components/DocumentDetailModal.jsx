import React, { useState, useEffect } from "react";
import { 
  FileText, 
  X, 
  Download, 
  Calendar, 
  User, 
  HardDrive, 
  Tag, 
  MessageSquare, 
  Clock, 
  Send, 
  Trash2, 
  CornerDownRight 
} from "./icons";
import { api } from "../api";

export function DocumentDetailModal({ isOpen, docId, currentUser, onClose, onDownload, onEdit }) {
  const [doc, setDoc] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "comments" | "activity"
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (isOpen && docId) {
      loadDocumentDetails();
    }
  }, [isOpen, docId]);

  const loadDocumentDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getDocument(docId);
      setDoc(res.data);
      loadComments();
      loadActivities();
    } catch (err) {
      console.error("Failed to load document details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await api.getComments(docId);
      setComments(res.data || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const loadActivities = async () => {
    try {
      const res = await api.getActivityFeed(docId);
      setActivities(res.data || []);
    } catch (err) {
      console.error("Failed to load activities:", err);
    }
  };

  const handlePostComment = async (parentId = null) => {
    const text = parentId ? replyText : newCommentText;
    if (!text || !text.trim()) return;

    setPostingComment(true);
    try {
      await api.addComment(docId, {
        comment: text.trim(),
        parent_id: parentId
      });
      if (parentId) {
        setReplyingTo(null);
        setReplyText("");
      } else {
        setNewCommentText("");
      }
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await api.deleteComment(docId, commentId);
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to delete comment.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container doc-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FileText size={20} color="#2563eb" />
            <h3 style={{ maxWidth: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doc?.title || "Document Details"}
            </h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading details...</div>
        ) : doc ? (
          <div className="modal-content-wrap">
            <div className="detail-tabs">
              <button
                className={`detail-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`detail-tab-btn ${activeTab === "comments" ? "active" : ""}`}
                onClick={() => setActiveTab("comments")}
              >
                Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0)})
              </button>
              <button
                className={`detail-tab-btn ${activeTab === "activity" ? "active" : ""}`}
                onClick={() => setActiveTab("activity")}
              >
                Activity Feed
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="overview-tab-content">
                <div className="overview-meta-grid">
                  <div className="meta-box">
                    <span className="meta-label">Category</span>
                    <span className="meta-value doc-category-badge">{doc.category || "General"}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-label">Version</span>
                    <span className="meta-value doc-version-badge">v{doc.version || 1}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-label">File Size</span>
                    <span className="meta-value">{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-label">Uploaded By</span>
                    <span className="meta-value">{doc.owner_name}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-label">Original Filename</span>
                    <span className="meta-value" style={{ wordBreak: "break-all" }}>{doc.original_file_name || doc.file_name}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-label">Expiry Date</span>
                    <span className="meta-value">{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "None"}</span>
                  </div>
                </div>

                {doc.description && (
                  <div className="overview-description-box">
                    <h5>Description</h5>
                    <p>{doc.description}</p>
                  </div>
                )}

                {doc.tags && doc.tags.length > 0 && (
                  <div className="overview-tags-box">
                    <h5>Tags</h5>
                    <div className="tags-flex">
                      {doc.tags.map((t, idx) => (
                        <span key={idx} className="doc-tag">#{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overview-actions-row">
                  <button className="btn btn-primary" onClick={() => onDownload(doc)}>
                    <Download size={16} /> Download File
                  </button>
                </div>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="comments-tab-content">
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                      <MessageSquare size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                      <p>No comments yet. Start the discussion below!</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment-thread">
                        <div className="comment-card">
                          <div className="comment-avatar">
                            {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="comment-body">
                            <div className="comment-author-row">
                              <span className="author-name">{comment.user_name}</span>
                              <span className="comment-time">{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <div className="comment-text">{comment.comment}</div>
                            <div className="comment-actions">
                              <button
                                className="btn-reply-action"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              >
                                Reply
                              </button>
                              {(currentUser?.id === comment.user_id || currentUser?.role === "ADMIN") && (
                                <button
                                  className="btn-delete-comment"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="nested-replies-list">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="comment-card reply-card">
                                <div className="comment-avatar avatar-sm">
                                  {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="comment-body">
                                  <div className="comment-author-row">
                                    <span className="author-name">{reply.user_name}</span>
                                    <span className="comment-time">{new Date(reply.created_at).toLocaleString()}</span>
                                  </div>
                                  <div className="comment-text">{reply.comment}</div>
                                  <div className="comment-actions">
                                    {(currentUser?.id === reply.user_id || currentUser?.role === "ADMIN") && (
                                      <button
                                        className="btn-delete-comment"
                                        onClick={() => handleDeleteComment(reply.id)}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="reply-input-box">
                            <CornerDownRight size={16} color="#64748b" />
                            <input
                              type="text"
                              className="form-input"
                              placeholder={`Reply to ${comment.user_name}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handlePostComment(comment.id); }}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handlePostComment(comment.id)}
                              disabled={postingComment || !replyText.trim()}
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="new-comment-box">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePostComment(); }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePostComment()}
                    disabled={postingComment || !newCommentText.trim()}
                  >
                    <Send size={16} /> Post
                  </button>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="activity-tab-content">
                {activities.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                    <Clock size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                    <p>No activity records logged for this document.</p>
                  </div>
                ) : (
                  <div className="activity-timeline">
                    {activities.map((act) => (
                      <div key={act.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-user">{act.user_name}</span>
                            <span className="timeline-action badge-action">{act.action}</span>
                            <span className="timeline-date">{new Date(act.created_at).toLocaleString()}</span>
                          </div>
                          {act.details && <p className="timeline-details">{act.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "#dc2626" }}>Failed to load document.</div>
        )}
      </div>
    </div>
  );
}
