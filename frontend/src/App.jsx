import { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import { 
  Search, 
  FolderOpen, 
  FileText, 
  Share2, 
  History, 
  Plus, 
  Star, 
  Filter, 
  AlertTriangle,
  Clock,
  FileCheck,
  ArrowUp,
  X
} from "./components/icons";
import { Router, Routes, Route, useNavigate, useLocation } from "./router";
import { api, getCurrentUser, setCurrentUser, setToken } from "./api";

// Components
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { DocumentCard } from "./components/DocumentCard";
import { UploadModal } from "./components/UploadModal";
import { DocumentDetailModal } from "./components/DocumentDetailModal";
import { ShareModal } from "./components/ShareModal";
import { VersionModal } from "./components/VersionModal";
import { CategoriesModal } from "./components/CategoriesModal";
import { ProfileModal } from "./components/ProfileModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { ApprovalModal } from "./components/ApprovalModal";
import { ApprovalsView } from "./components/ApprovalsView";
import { Toast } from "./components/Toast";
import { Pagination } from "./components/Pagination";
import { UserManagementView } from "./components/UserManagementView";
import { AuditLogsView } from "./components/AuditLogsView";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

// Public Pages
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function AuthenticatedWorkspace({ currentUser, onUserChange, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    document.getElementById("navbar-menu-btn")?.focus();
  }, []);
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia("(min-width: 1025px)");
    const closeSidebarOnDesktop = () => {
      if (desktopMediaQuery.matches) setSidebarOpen(false);
    };

    closeSidebarOnDesktop();
    desktopMediaQuery.addEventListener("change", closeSidebarOnDesktop);
    return () => desktopMediaQuery.removeEventListener("change", closeSidebarOnDesktop);
  }, []);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);
  
  // Data state
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState("newest");

  const sortedDocuments = useMemo(() => {
    return documents
      .map((document, index) => ({
        document,
        index,
        timestamp: Date.parse(document.created_at),
      }))
      .sort((a, b) => {
        const aHasValidDate = Number.isFinite(a.timestamp);
        const bHasValidDate = Number.isFinite(b.timestamp);

        if (aHasValidDate !== bHasValidDate) {
          return aHasValidDate ? -1 : 1;
        }
        if (!aHasValidDate || a.timestamp === b.timestamp) {
          return a.index - b.index;
        }

        return sortOrder === "newest"
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp;
      })
      .map(({ document }) => document);
  }, [documents, sortOrder]);

  // Modals state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Approval modal state
  const [approvalModalDoc, setApprovalModalDoc] = useState(null);
  const [approvalModalMode, setApprovalModalMode] = useState("submit"); // "submit" | "review"

  const [activeDetailDocId, setActiveDetailDocId] = useState(null);
  const linkedDocumentId = pathname.match(/^\/documents\/(\d+)\/?$/)?.[1] || null;
  const selectedDetailDocId = linkedDocumentId || activeDetailDocId;
  const [activeShareDoc, setActiveShareDoc] = useState(null);
  const [activeVersionDoc, setActiveVersionDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showSuccess = (msg) => showToast(msg, "success");
  const showError = (msg) => showToast(msg, "error");

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadExpiring();
    loadPendingCount();
  }, []);

  useEffect(() => {
    if (currentView === "dashboard" || currentView === "documents") {
      loadDocuments();
    } else if (currentView === "shared") {
      loadSharedWithMe();
    }
  }, [currentView, searchQuery, selectedCategory, onlyFavorites, currentPage]);

  const loadPendingCount = async () => {
    if (currentUser?.role === "MANAGER" || currentUser?.role === "ADMIN") {
      try {
        const res = await api.getPendingApprovals();
        setPendingApprovalsCount(res.data ? res.data.length : 0);
      } catch (err) {
        // ignore
      }
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadExpiring = async () => {
    try {
      const res = await api.getExpiringDocuments();
      setExpiringDocs(res.data || []);
    } catch (err) {
      console.error("Failed to load expiring docs:", err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments({
        page: currentPage,
        limit: 12,
        search: searchQuery,
        category: selectedCategory,
        favorite: onlyFavorites ? "true" : undefined
      });
      setDocuments(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      showError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  const loadSharedWithMe = async () => {
    setLoading(true);
    try {
      const res = await api.getSharedWithMe();
      setSharedDocs(res.data || []);
    } catch (err) {
      showError(err.message || "Failed to load shared documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (docId) => {
    try {
      const res = await api.toggleFavorite(docId);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, is_favorite: res.data.is_favorite } : d))
      );
    } catch (err) {
      showError(err.message || "Failed to update favorite.");
    }
  };

  const handleDownload = (doc) => {
    window.open(api.getDownloadUrl(doc.id), "_blank");
  };

  const handleCopyDocumentName = async (doc) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(doc.title);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = doc.title;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();

        try {
          if (!document.execCommand("copy")) {
            throw new Error("Clipboard copy command was rejected.");
          }
        } finally {
          textArea.remove();
        }
      }

      showSuccess("Document name copied!");
    } catch {
      showError("Could not copy the document name. Check clipboard permissions and try again.");
    }
  };

  const closeDocumentDetail = () => {
    setActiveDetailDocId(null);
    if (linkedDocumentId) {
      navigate("/dashboard");
    }
  };

  const handleOpenSubmitApproval = (doc) => {
    setApprovalModalDoc(doc);
    setApprovalModalMode("submit");
  };

  const handleOpenReviewApproval = (doc, initialDecision = "approve") => {
    setApprovalModalDoc(doc);
    setApprovalModalMode("review");
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      showSuccess(`'${docToDelete.title}' has been deleted.`);
      setDocToDelete(null);
      loadDocuments();
      loadPendingCount();
    } catch (err) {
      showError(err.message || "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="workspace-layout">
      <Navbar
        user={currentUser}
        onLogout={onLogout}
        onOpenProfile={() => setProfileOpen(true)}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={sidebarOpen}
      />

      <div className="workspace-body">
        <Sidebar
          currentView={currentView}
          setCurrentView={(v) => {
            if (v === "categories") {
              setCategoriesOpen(true);
            } else {
              setCurrentView(v);
              setCurrentPage(1);
            }
          }}
          user={currentUser}
          onOpenUpload={() => setUploadOpen(true)}
          isOpen={sidebarOpen}
          onCloseMobile={closeSidebar}
          pendingCount={pendingApprovalsCount}
        />

        <main className="workspace-main">
          {/* View: Dashboard */}
          {currentView === "dashboard" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>Workspace Dashboard</h2>
                  <p className="view-subtitle">Overview of your documents, recent revisions, and approval statuses.</p>
                </div>
                <div className="view-header-actions">
                  <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
                    <Plus size={16} /> Upload Document
                  </button>
                </div>
              </div>

              {/* Expiring Documents Alert if any */}
              {expiringDocs.length > 0 && (
                <div className="expiring-alert-card">
                  <div className="alert-icon-col">
                    <Clock size={20} color="#b45309" />
                  </div>
                  <div className="alert-content-col">
                    <h4>Documents Approaching Expiry ({expiringDocs.length})</h4>
                    <p>The following documents expire within the next 30 days:</p>
                    <div className="expiring-items-list">
                      {expiringDocs.map((ed) => (
                        <button
                          key={ed.id}
                          className="expiring-item-pill"
                          onClick={() => setActiveDetailDocId(ed.id)}
                        >
                          <strong>{ed.title}</strong> (Expires {new Date(ed.expiry_date).toLocaleDateString()})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="dashboard-filter-card">
                <div className="search-input-wrap" style={{ flex: 2 }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search documents by title or description..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      aria-label="Clear search"
                      onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="filter-select-wrap">
                  <label className="filter-label" htmlFor="dashboard-sort-order">Sort by:</label>
                  <select
                    id="dashboard-sort-order"
                    className="form-select form-select-sm"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div className="category-chips-row">
                  <button
                    className={`cat-chip ${selectedCategory === "All" ? "active" : ""}`}
                    onClick={() => { setSelectedCategory("All"); setCurrentPage(1); }}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id || c.name}
                      className={`cat-chip ${selectedCategory === c.name ? "active" : ""}`}
                      onClick={() => { setSelectedCategory(c.name); setCurrentPage(1); }}
                    >
                      {c.name}
                    </button>
                  ))}
                  <button
                    className={`cat-chip cat-fav-chip ${onlyFavorites ? "active" : ""}`}
                    onClick={() => { setOnlyFavorites(!onlyFavorites); setCurrentPage(1); }}
                  >
                    <Star size={14} fill={onlyFavorites ? "#FACC15" : "none"} /> Favorites
                  </button>
                </div>
              </div>

              {/* Documents Grid */}
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="empty-state-card">
                  <FolderOpen size={48} color="#94a3b8" />
                  <h3>No Documents Found</h3>
                  <p>Upload a new file or adjust your search filters to find documents.</p>
                  <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
                    <Plus size={16} /> Upload First Document
                  </button>
                </div>
              ) : (
                <>
                  <div className="documents-grid">
                    {sortedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        currentUser={currentUser}
                        onView={(d) => setActiveDetailDocId(d.id)}
                        onDownload={handleDownload}
                        onCopyName={handleCopyDocumentName}
                        onEdit={(d) => setEditDoc(d)}
                        onShare={(d) => setActiveShareDoc(d)}
                        onVersions={(d) => setActiveVersionDoc(d)}
                        onToggleFavorite={handleToggleFavorite}
                        onDelete={(d) => setDocToDelete(d)}
                        onSubmitApproval={handleOpenSubmitApproval}
                        onReviewApproval={handleOpenReviewApproval}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </>
              )}
            </div>
          )}

          {/* View: All Documents */}
          {currentView === "documents" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>All Documents</h2>
                  <p className="view-subtitle">Browse, filter, submit, and manage all organizational documents.</p>
                </div>
                <div className="view-header-actions">
                  <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
                    <Plus size={16} /> Upload Document
                  </button>
                </div>
              </div>

              <div className="dashboard-filter-card">
                <div className="search-input-wrap" style={{ flex: 2 }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      aria-label="Clear search"
                      onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="filter-select-wrap">
                  <label className="filter-label" htmlFor="documents-sort-order">Sort by:</label>
                  <select
                    id="documents-sort-order"
                    className="form-select form-select-sm"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <div className="filter-select-wrap">
                  <label className="filter-label">Category:</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  className={`btn btn-secondary btn-sm ${onlyFavorites ? "active" : ""}`}
                  onClick={() => { setOnlyFavorites(!onlyFavorites); setCurrentPage(1); }}
                >
                  <Star size={14} fill={onlyFavorites ? "#FACC15" : "none"} /> Favorites Only
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="empty-state-card">
                  <FolderOpen size={48} color="#94a3b8" />
                  <h3>No Documents Found</h3>
                  <p>Try clearing your search query or upload a new file.</p>
                </div>
              ) : (
                <>
                  <div className="documents-grid">
                    {sortedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        currentUser={currentUser}
                        onView={(d) => setActiveDetailDocId(d.id)}
                        onDownload={handleDownload}
                        onCopyName={handleCopyDocumentName}
                        onEdit={(d) => setEditDoc(d)}
                        onShare={(d) => setActiveShareDoc(d)}
                        onVersions={(d) => setActiveVersionDoc(d)}
                        onToggleFavorite={handleToggleFavorite}
                        onDelete={(d) => setDocToDelete(d)}
                        onSubmitApproval={handleOpenSubmitApproval}
                        onReviewApproval={handleOpenReviewApproval}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </>
              )}
            </div>
          )}

          {/* View: Document Approvals (Manager / Admin) */}
          {currentView === "approvals" && (
            <ApprovalsView
              onReviewDoc={handleOpenReviewApproval}
              onViewDoc={(d) => setActiveDetailDocId(d.id)}
              onError={showError}
            />
          )}

          {/* View: Shared With Me */}
          {currentView === "shared" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>Shared With Me</h2>
                  <p className="view-subtitle">Documents shared directly with you by team members.</p>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading shared documents...</div>
              ) : sharedDocs.length === 0 ? (
                <div className="empty-state-card">
                  <Share2 size={48} color="#94a3b8" />
                  <h3>No Shared Documents</h3>
                  <p>When colleagues share documents with you, they will appear here with your granted permission level.</p>
                </div>
              ) : (
                <div className="documents-grid">
                  {sharedDocs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      currentUser={currentUser}
                      onView={(d) => setActiveDetailDocId(d.id)}
                      onDownload={handleDownload}
                      onCopyName={handleCopyDocumentName}
                      onEdit={(d) => setEditDoc(d)}
                      onShare={(d) => setActiveShareDoc(d)}
                      onVersions={(d) => setActiveVersionDoc(d)}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={(d) => setDocToDelete(d)}
                      onSubmitApproval={handleOpenSubmitApproval}
                      onReviewApproval={handleOpenReviewApproval}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View: User Management (Admin / Manager) */}
          {currentView === "users" && (
            <UserManagementView
              currentUser={currentUser}
              onSuccess={showSuccess}
              onError={showError}
            />
          )}

          {/* View: Audit Logs (Admin) */}
          {currentView === "audit-logs" && (
            <AuditLogsView onError={showError} />
          )}

          {/* View: Analytics */}
          {currentView === "analytics" && (
            <AnalyticsDashboard currentUser={currentUser} onError={showError} />
          )}
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories}
        onSuccess={(msg) => { showSuccess(msg); loadDocuments(); }}
        onError={showError}
      />

      <DocumentDetailModal
        isOpen={Boolean(selectedDetailDocId)}
        docId={selectedDetailDocId}
        currentUser={currentUser}
        onClose={closeDocumentDetail}
        onDownload={handleDownload}
        onEdit={(d) => { closeDocumentDetail(); setEditDoc(d); }}
        onSubmitApproval={(d) => { closeDocumentDetail(); handleOpenSubmitApproval(d); }}
        onReviewApproval={(d) => { closeDocumentDetail(); handleOpenReviewApproval(d); }}
      />

      <ApprovalModal
        isOpen={Boolean(approvalModalDoc)}
        mode={approvalModalMode}
        doc={approvalModalDoc}
        onClose={() => setApprovalModalDoc(null)}
        onSuccess={(msg) => {
          showSuccess(msg);
          loadDocuments();
          loadPendingCount();
        }}
        onError={showError}
      />

      <ShareModal
        isOpen={Boolean(activeShareDoc)}
        doc={activeShareDoc}
        onClose={() => setActiveShareDoc(null)}
        onSuccess={showSuccess}
        onError={showError}
      />

      <VersionModal
        isOpen={Boolean(activeVersionDoc)}
        doc={activeVersionDoc}
        currentUser={currentUser}
        onClose={() => setActiveVersionDoc(null)}
        onSuccess={(msg) => { showSuccess(msg); loadDocuments(); }}
        onError={showError}
      />

      <CategoriesModal
        isOpen={categoriesOpen}
        currentUser={currentUser}
        onClose={() => setCategoriesOpen(false)}
        onCategoriesUpdated={(cats) => setCategories(cats)}
      />

      <ProfileModal
        isOpen={profileOpen}
        user={currentUser}
        onClose={() => setProfileOpen(false)}
        onUserUpdated={onUserChange}
        onSuccess={showSuccess}
        onError={showError}
      />

      <ConfirmModal
        isOpen={Boolean(docToDelete)}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${docToDelete?.title}"? All versions, discussions, and shares will be permanently removed.`}
        confirmText="Delete Document"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      /* ignore */
    }
    setToken(null);
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            currentUser ? (
              <AuthenticatedWorkspace
                currentUser={currentUser}
                onUserChange={setCurrentUser}
                onLogout={handleLogout}
              />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/register"
          element={
            currentUser ? (
              <AuthenticatedWorkspace
                currentUser={currentUser}
                onUserChange={setCurrentUser}
                onLogout={handleLogout}
              />
            ) : (
              <RegisterPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/documents"
          element={
            currentUser ? (
              <AuthenticatedWorkspace
                currentUser={currentUser}
                onUserChange={setCurrentUser}
                onLogout={handleLogout}
              />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="*"
          element={
            currentUser ? (
              <AuthenticatedWorkspace
                currentUser={currentUser}
                onUserChange={setCurrentUser}
                onLogout={handleLogout}
              />
            ) : (
              <LandingPage />
            )
          }
        />
      </Routes>
    </Router>
  );
}
