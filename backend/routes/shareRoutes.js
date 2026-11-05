const express = require("express");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit, logActivity } = require("../utils/auditLogger");

const router = express.Router();
router.use(authenticateToken);

// Helper: Check if user can manage sharing for document (Owner or Admin)
async function canManageShares(documentId, user) {
    if (user.role === "ADMIN") return true;
    const [doc] = await pool.query("SELECT user_id FROM documents WHERE id = ?", [documentId]);
    return doc.length > 0 && doc[0].user_id === user.id;
}

// GET /api/shares/shared-with-me (Documents shared with current user)
router.get("/shared-with-me", async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*, ds.permission, ds.created_at as shared_at,
                   u.name as owner_name, u.email as owner_email,
                   sb.name as shared_by_name
            FROM document_shares ds
            JOIN documents d ON d.id = ds.document_id
            JOIN users u ON u.id = d.user_id
            JOIN users sb ON sb.id = ds.shared_by
            WHERE ds.shared_with = ?
            ORDER BY ds.created_at DESC
        `, [req.user.id]);

        return res.json(successResponse("Shared documents retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// GET /api/shares/:id (List shares for a document)
router.get("/:id", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const allowed = await canManageShares(documentId, req.user);
        if (!allowed) {
            return next(new AppError("You do not have permission to view shares for this document.", 403));
        }

        const [shares] = await pool.query(`
            SELECT ds.id, ds.permission, ds.created_at,
                   u.id as user_id, u.name as user_name, u.email as user_email
            FROM document_shares ds
            JOIN users u ON u.id = ds.shared_with
            WHERE ds.document_id = ?
            ORDER BY ds.created_at DESC
        `, [documentId]);

        return res.json(successResponse("Document shares retrieved.", shares));
    } catch (err) {
        next(err);
    }
});

// POST /api/shares/:id (Share document with user)
router.post("/:id", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const allowed = await canManageShares(documentId, req.user);
        if (!allowed) {
            return next(new AppError("Only the document owner or an administrator can share this document.", 403));
        }

        const { target_email, target_user_id, permission = "VIEW" } = req.body;

        if (!["VIEW", "DOWNLOAD", "EDIT"].includes(permission)) {
            return next(new AppError("Invalid permission. Choose VIEW, DOWNLOAD, or EDIT.", 400));
        }

        let targetUser;
        if (target_user_id) {
            const [u] = await pool.query("SELECT id, name, email FROM users WHERE id = ?", [target_user_id]);
            if (u.length > 0) targetUser = u[0];
        } else if (target_email && target_email.trim()) {
            const [u] = await pool.query("SELECT id, name, email FROM users WHERE email = ?", [target_email.trim().toLowerCase()]);
            if (u.length > 0) targetUser = u[0];
        }

        if (!targetUser) {
            return next(new AppError("User not found with the provided email or ID.", 404));
        }

        if (targetUser.id === req.user.id) {
            return next(new AppError("You cannot share a document with yourself.", 400));
        }

        // Insert or update share permission
        await pool.query(`
            INSERT INTO document_shares (document_id, shared_by, shared_with, permission)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE permission = VALUES(permission), updated_at = CURRENT_TIMESTAMP
        `, [documentId, req.user.id, targetUser.id, permission]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_SHARE",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { shared_with: targetUser.email, permission }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "SHARED",
            details: `Shared with ${targetUser.name} (${permission})`
        });

        return res.json(successResponse(`Document shared successfully with ${targetUser.name}.`, {
            user_id: targetUser.id,
            user_name: targetUser.name,
            user_email: targetUser.email,
            permission
        }));
    } catch (err) {
        next(err);
    }
});

// DELETE /api/shares/:id/:shareId (Revoke document share)
router.delete("/:id/:shareId", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const shareId = Number(req.params.shareId);

        const allowed = await canManageShares(documentId, req.user);
        if (!allowed) {
            return next(new AppError("You do not have permission to revoke access to this document.", 403));
        }

        const [s] = await pool.query("SELECT shared_with FROM document_shares WHERE id = ? AND document_id = ?", [shareId, documentId]);
        if (s.length === 0) {
            return next(new AppError("Share record not found.", 404));
        }

        await pool.query("DELETE FROM document_shares WHERE id = ?", [shareId]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_REVOKE_SHARE",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { revoked_user_id: s[0].shared_with }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "SHARE_REVOKED",
            details: "Revoked document access"
        });

        return res.json(successResponse("Access revoked successfully."));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
