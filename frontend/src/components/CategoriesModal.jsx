import React, { useState, useEffect } from "react";
import { FolderOpen, X, Plus, Trash2, Edit3 } from "./icons";
import { api } from "../api";

export function CategoriesModal({ isOpen, currentUser, onClose, onCategoriesUpdated }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.getCategories();
      setCategories(res.data || []);
      if (onCategoriesUpdated) onCategoriesUpdated(res.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        await api.updateCategory(editingId, { name: name.trim(), description, color });
      } else {
        await api.createCategory({ name: name.trim(), description, color });
      }
      setName("");
      setDescription("");
      setColor("#2563eb");
      setEditingId(null);
      loadCategories();
    } catch (err) {
      alert(err.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setColor(cat.color || "#2563eb");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.deleteCategory(id);
      loadCategories();
    } catch (err) {
      alert(err.message || "Failed to delete category.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container categories-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FolderOpen size={20} color="#2563eb" />
            <h3>Manage Document Categories</h3>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {canManage && (
          <form onSubmit={handleSave} className="category-form">
            <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#334155" }}>
              {editingId ? "Edit Category" : "Add New Category"}
            </h4>
            <div className="form-row" style={{ gap: 12, alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Invoices"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ width: 64, marginBottom: 0 }}>
                <label className="form-label">Color</label>
                <input
                  type="color"
                  className="form-input"
                  style={{ height: 40, padding: 2, cursor: "pointer" }}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ height: 40 }}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setEditingId(null); setName(""); setDescription(""); }}
                  style={{ height: 40 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <div className="categories-list-section">
          <h4 style={{ fontSize: "0.95rem", color: "#334155", margin: "20px 0 12px 0" }}>
            Available Categories ({categories.length})
          </h4>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading categories...</div>
          ) : (
            <div className="categories-grid">
              {categories.map((cat) => (
                <div key={cat.id} className="category-item-card">
                  <div className="cat-header-row">
                    <span className="cat-color-dot" style={{ backgroundColor: cat.color || "#2563eb" }}></span>
                    <span className="cat-name">{cat.name}</span>
                    <span className="cat-doc-count">{cat.document_count || 0} docs</span>
                  </div>
                  {cat.description && <p className="cat-desc">{cat.description}</p>}
                  {canManage && (
                    <div className="cat-actions-row">
                      <button className="btn-icon" onClick={() => handleEdit(cat)} title="Edit Category">
                        <Edit3 size={15} />
                      </button>
                      {currentUser?.role === "ADMIN" && (
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(cat.id)} title="Delete Category">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
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
