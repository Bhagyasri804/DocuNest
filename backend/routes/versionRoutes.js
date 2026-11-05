const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit, logActivity } = require("../utils/auditLogger");

const router = express.Router();
router.use(authenticateToken);

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        cb(null, `doc-v-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

async function canEditDocument(documentId, user) {
    if (user.role === "ADMIN") return true;
    const [doc] = await pool.query("SELECT user_id FROM documents WHERE id = ?", [documentId]);
    if (doc.length === 0) return false;
    if (doc[0].user_id === user.id) return true;

    const [share] = await pool.query("SELECT permission FROM document_shares WHERE document_id = ? AND shared_with = ?", [documentId, user.id]);
    return share.length > 0 && share[0].permission === "EDIT";
}

// GET /api/versions/:id (List versions)
router.get("/:id", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const [versions] = await pool.query(`
            SELECT dv.*, u.name as uploader_name, u.email as uploader_email
            FROM document_versions dv
            JOIN users u ON u.id = dv.uploaded_by
            WHERE dv.document_id = ?
            ORDER BY dv.version_number DESC
        `, [documentId]);

        return res.json(successResponse("Versions retrieved.", versions));
    } catch (err) {
        next(err);
    }
});

// POST /api/versions/:id (Upload new version)
router.post("/:id", upload.single("file"), async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const allowed = await canEditDocument(documentId, req.user);
        if (!allowed) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new AppError("You do not have permission to upload new versions of this document.", 403));
        }

        if (!req.file) {
            return next(new AppError("Please select a file to upload.", 400));
        }

        const { comment } = req.body;

        // Get max current version
        const [maxRow] = await pool.query("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM document_versions WHERE document_id = ?", [documentId]);
        const nextVersion = maxRow[0].next_version || 1;

        // Insert new version
        await pool.query(`
            INSERT INTO document_versions (
                document_id, version_number, file_name, original_file_name,
                mime_type, file_size, comment, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            documentId,
            nextVersion,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            comment || `Version ${nextVersion}`,
            req.user.id
        ]);

        // Update main document to point to latest file and version
        await pool.query(`
            UPDATE documents SET 
                version = ?,
                file_name = ?,
                original_file_name = ?,
                mime_type = ?,
                file_size = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nextVersion,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            documentId
        ]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_NEW_VERSION",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { version: nextVersion, file_name: req.file.originalname }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "VERSION_UPLOADED",
            details: `Uploaded Version ${nextVersion}: ${req.file.originalname}`
        });

        return res.status(201).json(successResponse(`Version ${nextVersion} uploaded successfully.`, {
            version: nextVersion,
            file_name: req.file.filename,
            original_file_name: req.file.originalname
        }));
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        next(err);
    }
});

// GET /api/versions/:id/:versionId/download (Download specific version)
router.get("/:id/:versionId/download", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const versionId = Number(req.params.versionId);

        const [rows] = await pool.query(
            "SELECT file_name, original_file_name, mime_type FROM document_versions WHERE id = ? AND document_id = ?",
            [versionId, documentId]
        );

        if (rows.length === 0 || !rows[0].file_name) {
            return next(new AppError("Version file not found.", 404));
        }

        const filePath = path.join(UPLOADS_DIR, rows[0].file_name);
        if (!fs.existsSync(filePath)) {
            return next(new AppError("Version file is missing from storage.", 404));
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_VERSION_DOWNLOAD",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { versionId }
        });

        return res.download(filePath, rows[0].original_file_name);
    } catch (err) {
        next(err);
    }
});

// POST /api/versions/:id/:versionId/restore (Restore older version)
router.post("/:id/:versionId/restore", async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const versionId = Number(req.params.versionId);

        const allowed = await canEditDocument(documentId, req.user);
        if (!allowed) {
            return next(new AppError("You do not have permission to restore versions for this document.", 403));
        }

        const [vRow] = await pool.query(
            "SELECT * FROM document_versions WHERE id = ? AND document_id = ?",
            [versionId, documentId]
        );

        if (vRow.length === 0) {
            return next(new AppError("Version record not found.", 404));
        }

        const target = vRow[0];

        // Duplicate the file to create a brand new version preserving the chain
        const ext = path.extname(target.file_name);
        const newFileName = `doc-v-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
        const srcPath = path.join(UPLOADS_DIR, target.file_name);
        const destPath = path.join(UPLOADS_DIR, newFileName);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
        }

        const [maxRow] = await pool.query("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM document_versions WHERE document_id = ?", [documentId]);
        const nextVersion = maxRow[0].next_version || 1;

        await pool.query(`
            INSERT INTO document_versions (
                document_id, version_number, file_name, original_file_name,
                mime_type, file_size, comment, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            documentId,
            nextVersion,
            newFileName,
            target.original_file_name,
            target.mime_type,
            target.file_size,
            `Restored from Version ${target.version_number}`,
            req.user.id
        ]);

        await pool.query(`
            UPDATE documents SET
                version = ?,
                file_name = ?,
                original_file_name = ?,
                mime_type = ?,
                file_size = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nextVersion,
            newFileName,
            target.original_file_name,
            target.mime_type,
            target.file_size,
            documentId
        ]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_VERSION_RESTORE",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { restoredFromVersion: target.version_number, newVersion: nextVersion }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "VERSION_RESTORED",
            details: `Restored Version ${target.version_number} as Version ${nextVersion}`
        });

        return res.json(successResponse(`Restored Version ${target.version_number} as new Version ${nextVersion}.`, {
            version: nextVersion
        }));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
