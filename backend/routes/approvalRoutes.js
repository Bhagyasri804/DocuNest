const express = require("express");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { logAudit, logActivity } = require("../utils/auditLogger");

const router = express.Router();
router.use(authenticateToken);

// Helper: Check document view permission
async function canViewDocument(documentId, user) {
    if (user.role === "ADMIN" || user.role === "MANAGER") return true;
    const [doc] = await pool.query("SELECT user_id FROM documents WHERE id = ?", [documentId]);
    if (doc.length === 0) return false;
    if (doc[0].user_id === user.id) return true;

    const [share] = await pool.query(
        "SELECT 1 FROM document_shares WHERE document_id = ? AND shared_with = ?",
        [documentId, user.id]
    );
    return share.length > 0;
}

// POST /api/approvals/:id/submit (Owner or Admin submits document for approval)
router.post("/:id/submit", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { comments } = req.body;

        const [docs] = await pool.query("SELECT id, user_id, title, approval_status FROM documents WHERE id = ?", [documentId]);
        if (docs.length === 0) {
            return next(new AppError("Document not found.", 404));
        }

        const doc = docs[0];
        if (doc.user_id !== req.user.id && req.user.role !== "ADMIN") {
            return next(new AppError("Only the document owner or an administrator can submit this document for approval.", 403));
        }

        if (doc.approval_status === "PENDING") {
            return next(new AppError("Document is already pending approval.", 400));
        }

        // Update document status to PENDING
        await pool.query(
            "UPDATE documents SET approval_status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [documentId]
        );

        // Record approval request
        const [result] = await pool.query(`
            INSERT INTO document_approvals (document_id, submitted_by, status, comments)
            VALUES (?, ?, 'PENDING', ?)
        `, [documentId, req.user.id, comments || null]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_SUBMIT_APPROVAL",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { title: doc.title, comments: comments || null }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "SUBMITTED_FOR_APPROVAL",
            details: comments ? `Submitted for approval with notes: "${comments}"` : "Submitted for manager/admin approval"
        });

        return res.json(successResponse("Document submitted for approval.", {
            document_id: documentId,
            approval_id: result.insertId,
            approval_status: "PENDING"
        }));
    } catch (err) {
        next(err);
    }
});

// POST /api/approvals/:id/approve (Manager or Admin approves document)
router.post("/:id/approve", authorizeRoles("MANAGER", "ADMIN"), async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { comments } = req.body;

        const [docs] = await pool.query("SELECT id, user_id, title, approval_status FROM documents WHERE id = ?", [documentId]);
        if (docs.length === 0) {
            return next(new AppError("Document not found.", 404));
        }

        const doc = docs[0];
        if (doc.approval_status !== "PENDING") {
            return next(new AppError(`Cannot approve document with status '${doc.approval_status}'. Document must be PENDING approval.`, 400));
        }

        // Update document status to APPROVED
        await pool.query(
            "UPDATE documents SET approval_status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [documentId]
        );

        // Update latest pending approval record
        const [pendingRows] = await pool.query(
            "SELECT id FROM document_approvals WHERE document_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1",
            [documentId]
        );

        if (pendingRows.length > 0) {
            await pool.query(`
                UPDATE document_approvals 
                SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, comments = COALESCE(?, comments)
                WHERE id = ?
            `, [req.user.id, comments || null, pendingRows[0].id]);
        } else {
            await pool.query(`
                INSERT INTO document_approvals (document_id, submitted_by, reviewed_by, status, comments, reviewed_at)
                VALUES (?, ?, ?, 'APPROVED', ?, CURRENT_TIMESTAMP)
            `, [documentId, doc.user_id, req.user.id, comments || null]);
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_APPROVED",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { title: doc.title, reviewer: req.user.name, comments: comments || null }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "DOCUMENT_APPROVED",
            details: comments ? `Approved by ${req.user.name} with notes: "${comments}"` : `Approved by ${req.user.name}`
        });

        return res.json(successResponse("Document approved successfully.", {
            document_id: documentId,
            approval_status: "APPROVED"
        }));
    } catch (err) {
        next(err);
    }
});

// POST /api/approvals/:id/reject (Manager or Admin rejects document with required reason)
router.post("/:id/reject", authorizeRoles("MANAGER", "ADMIN"), async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { rejection_reason } = req.body;

        if (!rejection_reason || !rejection_reason.trim()) {
            return next(new AppError("A rejection reason is required when rejecting a document.", 400));
        }

        const [docs] = await pool.query("SELECT id, user_id, title, approval_status FROM documents WHERE id = ?", [documentId]);
        if (docs.length === 0) {
            return next(new AppError("Document not found.", 404));
        }

        const doc = docs[0];
        if (doc.approval_status !== "PENDING") {
            return next(new AppError(`Cannot reject document with status '${doc.approval_status}'. Document must be PENDING approval.`, 400));
        }

        const cleanReason = rejection_reason.trim();

        // Update document status to REJECTED
        await pool.query(
            "UPDATE documents SET approval_status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [documentId]
        );

        // Update latest pending approval record
        const [pendingRows] = await pool.query(
            "SELECT id FROM document_approvals WHERE document_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1",
            [documentId]
        );

        if (pendingRows.length > 0) {
            await pool.query(`
                UPDATE document_approvals 
                SET status = 'REJECTED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
                WHERE id = ?
            `, [req.user.id, cleanReason, pendingRows[0].id]);
        } else {
            await pool.query(`
                INSERT INTO document_approvals (document_id, submitted_by, reviewed_by, status, rejection_reason, reviewed_at)
                VALUES (?, ?, ?, 'REJECTED', ?, CURRENT_TIMESTAMP)
            `, [documentId, doc.user_id, req.user.id, cleanReason]);
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_REJECTED",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { title: doc.title, reviewer: req.user.name, rejection_reason: cleanReason }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "DOCUMENT_REJECTED",
            details: `Rejected by ${req.user.name}. Reason: "${cleanReason}"`
        });

        return res.json(successResponse("Document rejected.", {
            document_id: documentId,
            approval_status: "REJECTED",
            rejection_reason: cleanReason
        }));
    } catch (err) {
        next(err);
    }
});

// GET /api/approvals/pending (Manager or Admin gets all documents pending approval)
router.get("/pending", authorizeRoles("MANAGER", "ADMIN"), async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.id, d.title, d.category, d.file_name, d.original_file_name, d.file_size, 
                   d.version, d.created_at, d.updated_at, d.approval_status,
                   u.name as owner_name, u.email as owner_email,
                   da.id as approval_id, da.submitted_at, da.comments as submission_notes
            FROM documents d
            JOIN users u ON u.id = d.user_id
            LEFT JOIN document_approvals da ON da.id = (
                SELECT id FROM document_approvals WHERE document_id = d.id ORDER BY id DESC LIMIT 1
            )
            WHERE d.approval_status = 'PENDING'
            ORDER BY d.updated_at DESC
        `);

        return res.json(successResponse("Pending approvals retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// GET /api/approvals/:id/history (View approval requests and review decisions for a document)
router.get("/:id/history", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const allowed = await canViewDocument(documentId, req.user);
        if (!allowed) {
            return next(new AppError("You do not have permission to view approval history for this document.", 403));
        }

        const [history] = await pool.query(`
            SELECT da.*, 
                   sub.name as submitter_name, sub.email as submitter_email,
                   rev.name as reviewer_name, rev.email as reviewer_email
            FROM document_approvals da
            JOIN users sub ON sub.id = da.submitted_by
            LEFT JOIN users rev ON rev.id = da.reviewed_by
            WHERE da.document_id = ?
            ORDER BY da.id DESC
        `, [documentId]);

        return res.json(successResponse("Approval history retrieved.", history));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
