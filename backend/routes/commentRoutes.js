const express = require("express");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logActivity } = require("../utils/auditLogger");

const router = express.Router();
router.use(authenticateToken);

// GET /api/comments/:id (Threaded comments for document)
router.get("/:id", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const [rows] = await pool.query(`
            SELECT c.*, u.name as user_name, u.email as user_email, u.role as user_role
            FROM document_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.document_id = ?
            ORDER BY c.created_at ASC
        `, [documentId]);

        // Group comments into root comments and replies
        const commentMap = {};
        const rootComments = [];

        for (const row of rows) {
            row.replies = [];
            commentMap[row.id] = row;
        }

        for (const row of rows) {
            if (row.parent_id && commentMap[row.parent_id]) {
                commentMap[row.parent_id].replies.push(row);
            } else {
                rootComments.push(row);
            }
        }

        return res.json(successResponse("Comments retrieved.", rootComments));
    } catch (err) {
        next(err);
    }
});

// POST /api/comments/:id (Add comment or reply)
router.post("/:id", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { comment, parent_id } = req.body;

        if (!comment || !comment.trim()) {
            return next(new AppError("Comment text cannot be empty.", 400));
        }

        const [result] = await pool.query(`
            INSERT INTO document_comments (document_id, user_id, parent_id, comment)
            VALUES (?, ?, ?, ?)
        `, [documentId, req.user.id, parent_id || null, comment.trim()]);

        const [newComment] = await pool.query(`
            SELECT c.*, u.name as user_name, u.email as user_email, u.role as user_role
            FROM document_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = ?
        `, [result.insertId]);

        await logActivity({
            documentId,
            userId: req.user.id,
            action: parent_id ? "REPLIED_COMMENT" : "ADDED_COMMENT",
            details: `Commented: "${comment.trim().slice(0, 50)}..."`
        });

        return res.status(201).json(successResponse("Comment posted.", newComment[0]));
    } catch (err) {
        next(err);
    }
});

// PUT /api/comments/:id/:commentId (Edit own comment)
router.put("/:id/:commentId", async (req, res, next) => {
    try {
        const commentId = Number(req.params.commentId);
        const { comment } = req.body;

        if (!comment || !comment.trim()) {
            return next(new AppError("Comment text cannot be empty.", 400));
        }

        const [existing] = await pool.query("SELECT user_id FROM document_comments WHERE id = ?", [commentId]);
        if (existing.length === 0) {
            return next(new AppError("Comment not found.", 404));
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== "ADMIN") {
            return next(new AppError("You can only edit your own comments.", 403));
        }

        await pool.query("UPDATE document_comments SET comment = ? WHERE id = ?", [comment.trim(), commentId]);

        return res.json(successResponse("Comment updated."));
    } catch (err) {
        next(err);
    }
});

// DELETE /api/comments/:id/:commentId (Delete comment)
router.delete("/:id/:commentId", async (req, res, next) => {
    try {
        const commentId = Number(req.params.commentId);

        const [existing] = await pool.query("SELECT user_id FROM document_comments WHERE id = ?", [commentId]);
        if (existing.length === 0) {
            return next(new AppError("Comment not found.", 404));
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== "ADMIN") {
            return next(new AppError("You can only delete your own comments.", 403));
        }

        await pool.query("DELETE FROM document_comments WHERE id = ?", [commentId]);

        return res.json(successResponse("Comment deleted."));
    } catch (err) {
        next(err);
    }
});

// GET /api/comments/:id/activity (Activity feed for document)
router.get("/:id/activity", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const [rows] = await pool.query(`
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM activity_logs a
            JOIN users u ON u.id = a.user_id
            WHERE a.document_id = ?
            ORDER BY a.created_at DESC
            LIMIT 50
        `, [documentId]);

        return res.json(successResponse("Activity logs retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
