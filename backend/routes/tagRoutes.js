const express = require("express");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// GET /api/tags
router.get("/", async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT t.*, COUNT(dt.document_id) AS document_count FROM tags t LEFT JOIN document_tags dt ON dt.tag_id = t.id GROUP BY t.id ORDER BY t.name ASC"
        );
        return res.json(successResponse("Tags retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// POST /api/tags
router.post("/", async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return next(new AppError("Tag name is required.", 400));
        }

        const cleanName = name.trim().toLowerCase();
        const [existing] = await pool.query("SELECT * FROM tags WHERE name = ?", [cleanName]);
        if (existing.length > 0) {
            return res.json(successResponse("Tag already exists.", existing[0]));
        }

        const [result] = await pool.query("INSERT INTO tags (name) VALUES (?)", [cleanName]);
        return res.status(201).json(successResponse("Tag created.", { id: result.insertId, name: cleanName }));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
