import { API_BASE_URL } from "./config/apiConfig";

function getToken() {
  return localStorage.getItem("docunest_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("docunest_token", token);
  } else {
    localStorage.removeItem("docunest_token");
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem("docunest_user");
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem("docunest_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("docunest_user");
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Request failed with status ${res.status}`;
      if (res.status === 401 && !endpoint.includes("/auth/login")) {
        // Token expired or invalid
        setToken(null);
        setCurrentUser(null);
        if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
          window.location.href = "/login?expired=1";
        }
      }
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (name, email, password) => request("/auth/register", { method: "POST", body: { name, email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request("/auth/me"),

  // Users & Profile
  getProfile: () => request("/users/profile"),
  updateProfile: (name) => request("/users/profile", { method: "PUT", body: { name } }),
  changePassword: (currentPassword, newPassword) => request("/users/password", { method: "PUT", body: { currentPassword, newPassword } }),
  getUsers: (q = "") => request(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: "PUT", body: { role } }),
  updateUserStatus: (id, status) => request(`/users/${id}/status`, { method: "PUT", body: { status } }),

  // Documents
  getDocuments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/documents${query ? `?${query}` : ""}`);
  },
  searchDocuments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/documents/search${query ? `?${query}` : ""}`);
  },
  getRecentDocuments: () => request("/documents/recent"),
  getExpiringDocuments: () => request("/documents/expiring"),
  getDocument: (id) => request(`/documents/${id}`),
  uploadDocument: (formData) => request("/documents/upload", { method: "POST", body: formData }),
  updateDocument: (id, data) => request(`/documents/${id}`, { method: "PUT", body: data }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  toggleFavorite: (id) => request(`/documents/${id}/favorite`, { method: "POST" }),
  getDownloadUrl: (id) => `${API_BASE_URL}/documents/${id}/download`,

  // Categories & Tags
  getCategories: () => request("/categories"),
  createCategory: (data) => request("/categories", { method: "POST", body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: "PUT", body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  getTags: () => request("/tags"),
  createTag: (name) => request("/tags", { method: "POST", body: { name } }),

  // Shares
  getSharedWithMe: () => request("/shares/shared-with-me"),
  getDocumentShares: (id) => request(`/shares/${id}`),
  shareDocument: (id, data) => request(`/shares/${id}`, { method: "POST", body: data }),
  revokeShare: (docId, shareId) => request(`/shares/${docId}/${shareId}`, { method: "DELETE" }),

  // Versions
  getDocumentVersions: (id) => request(`/versions/${id}`),
  uploadNewVersion: (id, formData) => request(`/versions/${id}`, { method: "POST", body: formData }),
  restoreVersion: (docId, versionId) => request(`/versions/${docId}/${versionId}/restore`, { method: "POST" }),
  getVersionDownloadUrl: (docId, versionId) => `${API_BASE_URL}/versions/${docId}/${versionId}/download`,

  // Comments & Activity
  getComments: (id) => request(`/comments/${id}`),
  addComment: (id, data) => request(`/comments/${id}`, { method: "POST", body: data }),
  deleteComment: (docId, commentId) => request(`/comments/${docId}/${commentId}`, { method: "DELETE" }),
  getActivityFeed: (id) => request(`/comments/${id}/activity`),

  // Audit Logs & Analytics
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit-logs${query ? `?${query}` : ""}`);
  },
  getAnalytics: () => request("/analytics/dashboard"),
};
