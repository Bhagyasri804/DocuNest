import React, { useState, useEffect } from "react";
import { BarChart3, FileText, HardDrive, Users, FolderOpen, Clock } from "./icons";
import { api } from "../api";
import { formatFileSize } from "../utils/formatFileSize";

export function AnalyticsDashboard({ currentUser, onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      onError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading analytics dashboard...</div>;
  }

  const { totalDocuments = 0, totalSizeBytes = 0, totalUsers = 0, categoryDistribution = [], monthlyUploads = [], recentActivity = [] } = data || {};

  const maxCatCount = Math.max(...categoryDistribution.map((c) => c.count), 1);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Analytics & System Overview</h2>
          <p className="view-subtitle">High-level metrics on storage usage, document distribution, and user engagement.</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#eff6ff" }}>
            <FileText size={24} color="#2563eb" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Documents</span>
            <span className="kpi-value">{totalDocuments}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#f0fdf4" }}>
            <HardDrive size={24} color="#16a34a" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Storage Utilized</span>
            <span className="kpi-value">{formatFileSize(totalSizeBytes)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#faf5ff" }}>
            <Users size={24} color="#9333ea" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Users</span>
            <span className="kpi-value">{totalUsers}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#fffbeb" }}>
            <FolderOpen size={24} color="#d97706" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Categories</span>
            <span className="kpi-value">{categoryDistribution.length}</span>
          </div>
        </div>
      </div>

      <div className="analytics-two-col">
        {/* Category Breakdown */}
        <div className="analytics-card">
          <h3 className="analytics-card-title">Document Category Distribution</h3>
          {categoryDistribution.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No document categories found.</div>
          ) : (
            <div className="category-bars-list">
              {categoryDistribution.map((item, idx) => {
                const percent = Math.round((item.count / totalDocuments) * 100) || 0;
                return (
                  <div key={idx} className="category-bar-item">
                    <div className="cat-bar-header">
                      <span className="cat-bar-name">{item.category}</span>
                      <span className="cat-bar-count">{item.count} docs ({percent}%)</span>
                    </div>
                    <div className="cat-progress-track">
                      <div
                        className="cat-progress-fill"
                        style={{
                          width: `${(item.count / maxCatCount) * 100}%`,
                          backgroundColor: "#2563eb",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="analytics-card">
          <h3 className="analytics-card-title">Recent Document Activity</h3>
          {recentActivity.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No recent activity.</div>
          ) : (
            <div className="activity-timeline mini-timeline">
              {recentActivity.map((act) => (
                <div key={act.id} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-user">{act.user_name}</span>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{act.action}</span>
                      <span className="timeline-date">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {act.details && <p className="timeline-details">{act.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
