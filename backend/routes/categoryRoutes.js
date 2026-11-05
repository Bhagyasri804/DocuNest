const express = require("express");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// GET /api/categories
router.get("/", async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT c.*, COUNT(d.id) AS document_count FROM categories c LEFT JOIN documents d ON d.category = c.name GROUP BY c.id ORDER BY c.name ASC"
        );
        return res.json(successResponse("Categories retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// POST /api/categories (ADMIN / MANAGER)
router.post("/", authorizeRoles("ADMIN", "MANAGER"), async (req, res, next) => {
    try {
        const { name, description, color } = req.body;
        if (!name || !name.trim()) {
            return next(new AppError("Category name is required.", 400));
        }

        const [existing] = await pool.query("SELECT id FROM categories WHERE name = ?", [name.trim()]);
        if (existing.length > 0) {
            return next(new AppError("Category with this name already exists.", 409));
        }

        const [result] = await pool.query(
            "INSERT INTO categories (name, description, color) VALUES (?, ?, ?)",
            [name.trim(), description || "", color || "#2563eb"]
        );

        return res.status(201).json(successResponse("Category created successfully.", {
            id: result.insertId,
            name: name.trim(),
            description,
            color: color || "#2563eb"
        }));
    } catch (err) {
        next(err);
    }
});

// PUT /api/categories/:id (ADMIN / MANAGER)
router.put("/:id", authorizeRoles("ADMIN", "MANAGER"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { name, description, color } = req.body;

        if (!name || !name.trim()) {
            return next(new AppError("Category name is required.", 400));
        }

        const [curr] = await pool.query("SELECT name FROM categories WHERE id = ?", [id]);
        if (curr.length === 0) {
            return next(new AppError("Category not found.", 404));
        }

        const oldName = curr[0].name;
        const newName = name.trim();

        await pool.query(
            "UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?",
            [newName, description || "", color || "#2563eb", id]
        );

        if (oldName !== newName) {
            await pool.query("UPDATE documents SET category = ? WHERE category = ?", [newName, oldName]);
        }

        return res.json(successResponse("Category updated successfully."));
    } catch (err) {
        next(err);
    }
});

// DELETE /api/categories/:id (ADMIN only)
router.delete("/:id", authorizeRoles("ADMIN"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await pool.query("DELETE FROM categories WHERE id = ?", [id]);
        return res.json(successResponse("Category deleted successfully."));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
