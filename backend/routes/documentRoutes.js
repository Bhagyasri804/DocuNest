const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse, paginationResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit, logActivity } = require("../utils/auditLogger");

const router = express.Router();
router.use(authenticateToken);

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".png", ".jpg", ".jpeg"
]);

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/png",
    "image/jpeg"
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        cb(null, `doc-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return cb(new AppError(`File type '${ext}' is not supported. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, PNG, JPG.`, 400));
        }
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new AppError(`MIME type '${file.mimetype}' is not permitted.`, 400));
        }
        cb(null, true);
    }
});

// Helper: Check user's permission for a document
async function getDocumentPermission(documentId, user) {
    if (user.role === "ADMIN") return "ADMIN";

    const [doc] = await pool.query("SELECT user_id FROM documents WHERE id = ?", [documentId]);
    if (doc.length === 0) return null;
    if (doc[0].user_id === user.id) return "OWNER";

    const [share] = await pool.query(
        "SELECT permission FROM document_shares WHERE document_id = ? AND shared_with = ?",
        [documentId, user.id]
    );
    if (share.length > 0) return share[0].permission; // 'VIEW', 'DOWNLOAD', 'EDIT'

    return null;
}

// GET /api/documents (List documents owned by user or shared with user)
router.get("/", async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const category = req.query.category;
        const search = req.query.search;
        const tag = req.query.tag;
        const favorite = req.query.favorite;

        let whereClause = `
            WHERE (d.user_id = ? OR ds.shared_with = ? OR ? = 'ADMIN')
        `;
        const params = [req.user.id, req.user.id, req.user.role];

        if (category && category !== "All") {
            whereClause += " AND d.category = ?";
            params.push(category);
        }

        if (favorite === "true" || favorite === "1") {
            whereClause += " AND d.is_favorite = 1";
        }

        if (search && search.trim()) {
            whereClause += " AND (d.title LIKE ? OR d.description LIKE ?)";
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        if (tag && tag.trim()) {
            whereClause += " AND EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = d.id AND t.name = ?)";
            params.push(tag.trim().toLowerCase());
        }

        // Count query
        const countSql = `
            SELECT COUNT(DISTINCT d.id) as total
            FROM documents d
            LEFT JOIN document_shares ds ON ds.document_id = d.id
            ${whereClause}
        `;
        const [countResult] = await pool.query(countSql, params);
        const totalItems = countResult[0].total;

        // Data query
        const dataSql = `
            SELECT DISTINCT d.*, u.name as owner_name, u.email as owner_email,
                CASE 
                    WHEN ? = 'ADMIN' THEN 'ADMIN'
                    WHEN d.user_id = ? THEN 'OWNER'
                    ELSE ds.permission
                END as access_permission
            FROM documents d
            JOIN users u ON u.id = d.user_id
            LEFT JOIN document_shares ds ON ds.document_id = d.id AND ds.shared_with = ?
            ${whereClause}
            ORDER BY d.updated_at DESC
            LIMIT ? OFFSET ?
        `;
        const dataParams = [req.user.role, req.user.id, req.user.id, ...params, limit, offset];
        const [docs] = await pool.query(dataSql, dataParams);

        // Fetch tags for these documents
        if (docs.length > 0) {
            const docIds = docs.map(d => d.id);
            const [tags] = await pool.query(`
                SELECT dt.document_id, t.name
                FROM document_tags dt
                JOIN tags t ON t.id = dt.tag_id
                WHERE dt.document_id IN (${docIds.map(() => "?").join(",")})
            `, docIds);

            const tagMap = {};
            for (const t of tags) {
                if (!tagMap[t.document_id]) tagMap[t.document_id] = [];
                tagMap[t.document_id].push(t.name);
            }

            for (const d of docs) {
                d.tags = tagMap[d.id] || [];
            }
        }

        return res.json(paginationResponse(docs, page, limit, totalItems, "Documents retrieved."));
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/recent (5 recently uploaded documents)
router.get("/recent", async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*, u.name as owner_name
            FROM documents d
            JOIN users u ON u.id = d.user_id
            WHERE (d.user_id = ? OR ? = 'ADMIN' OR EXISTS (SELECT 1 FROM document_shares ds WHERE ds.document_id = d.id AND ds.shared_with = ?))
            ORDER BY d.created_at DESC
            LIMIT 5
        `, [req.user.id, req.user.role, req.user.id]);

        return res.json(successResponse("Recent documents retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/expiring (Documents expiring in the next 30 days)
router.get("/expiring", async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*, u.name as owner_name
            FROM documents d
            JOIN users u ON u.id = d.user_id
            WHERE (d.user_id = ? OR ? = 'ADMIN')
              AND d.expiry_date IS NOT NULL
              AND d.expiry_date >= CURDATE()
              AND d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.expiry_date ASC
        `, [req.user.id, req.user.role]);

        return res.json(successResponse("Expiring documents retrieved.", rows));
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/search (Advanced search)
router.get("/search", async (req, res, next) => {
    try {
        const { q, category, tag, mime_type, sort = "date_desc", page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
        const offset = (pageNum - 1) * limitNum;

        let whereSql = "WHERE (d.user_id = ? OR ? = 'ADMIN' OR EXISTS (SELECT 1 FROM document_shares ds WHERE ds.document_id = d.id AND ds.shared_with = ?))";
        const params = [req.user.id, req.user.role, req.user.id];

        if (q && q.trim()) {
            whereSql += " AND (d.title LIKE ? OR d.description LIKE ?)";
            const term = `%${q.trim()}%`;
            params.push(term, term);
        }

        if (category && category !== "All") {
            whereSql += " AND d.category = ?";
            params.push(category);
        }

        if (mime_type && mime_type !== "All") {
            whereSql += " AND d.mime_type LIKE ?";
            params.push(`%${mime_type}%`);
        }

        if (tag && tag.trim()) {
            whereSql += " AND EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = d.id AND t.name = ?)";
            params.push(tag.trim().toLowerCase());
        }

        let orderBy = "d.created_at DESC";
        if (sort === "name_asc") orderBy = "d.title ASC";
        if (sort === "name_desc") orderBy = "d.title DESC";
        if (sort === "date_asc") orderBy = "d.created_at ASC";
        if (sort === "size_desc") orderBy = "d.file_size DESC";
        if (sort === "size_asc") orderBy = "d.file_size ASC";

        const countSql = `SELECT COUNT(DISTINCT d.id) as total FROM documents d ${whereSql}`;
        const [c] = await pool.query(countSql, params);
        const total = c[0].total;

        const dataSql = `
            SELECT d.*, u.name as owner_name
            FROM documents d
            JOIN users u ON u.id = d.user_id
            ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const [items] = await pool.query(dataSql, [...params, limitNum, offset]);

        return res.json(paginationResponse(items, pageNum, limitNum, total, "Search completed."));
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/:id (Document details)
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const permission = await getDocumentPermission(id, req.user);

        if (!permission) {
            return next(new AppError("You do not have permission to view this document.", 403));
        }

        const [rows] = await pool.query(`
            SELECT d.*, u.name as owner_name, u.email as owner_email
            FROM documents d
            JOIN users u ON u.id = d.user_id
            WHERE d.id = ?
        `, [id]);

        if (rows.length === 0) {
            return next(new AppError("Document not found.", 404));
        }

        const doc = rows[0];
        doc.user_permission = permission;

        // Fetch tags
        const [tags] = await pool.query(`
            SELECT t.name FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = ?
        `, [id]);
        doc.tags = tags.map(t => t.name);

        // Fetch shares count
        const [shares] = await pool.query("SELECT COUNT(*) as count FROM document_shares WHERE document_id = ?", [id]);
        doc.shares_count = shares[0].count;

        // Fetch comments count
        const [comments] = await pool.query("SELECT COUNT(*) as count FROM document_comments WHERE document_id = ?", [id]);
        doc.comments_count = comments[0].count;

        // Fetch versions count
        const [versions] = await pool.query("SELECT COUNT(*) as count FROM document_versions WHERE document_id = ?", [id]);
        doc.versions_count = versions[0].count;

        return res.json(successResponse("Document details retrieved.", doc));
    } catch (err) {
        next(err);
    }
});

// POST /api/documents/upload (Upload document)
router.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new AppError("Please select a file to upload.", 400));
        }

        const { title, category, description, tags, expiry_date } = req.body;
        const docTitle = (title && title.trim()) ? title.trim() : path.parse(req.file.originalname).name;
        const docCategory = (category && category.trim()) ? category.trim() : "General";
        const docExpiry = (expiry_date && expiry_date.trim()) ? expiry_date.trim() : null;

        const [result] = await pool.query(`
            INSERT INTO documents (
                user_id, title, category, description, expiry_date, 
                file_name, original_file_name, mime_type, file_size, version, is_favorite
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
        `, [
            req.user.id,
            docTitle,
            docCategory,
            description || null,
            docExpiry,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size
        ]);

        const documentId = result.insertId;

        // Insert initial version record
        await pool.query(`
            INSERT INTO document_versions (
                document_id, version_number, file_name, original_file_name, 
                mime_type, file_size, comment, uploaded_by
            ) VALUES (?, 1, ?, ?, ?, ?, 'Initial upload', ?)
        `, [
            documentId,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            req.user.id
        ]);

        // Process tags if provided
        if (tags) {
            const tagList = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
            for (const tagName of tagList) {
                let [tRow] = await pool.query("SELECT id FROM tags WHERE name = ?", [tagName]);
                let tagId;
                if (tRow.length === 0) {
                    const [newTag] = await pool.query("INSERT INTO tags (name) VALUES (?)", [tagName]);
                    tagId = newTag.insertId;
                } else {
                    tagId = tRow[0].id;
                }
                await pool.query("INSERT IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)", [documentId, tagId]);
            }
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_UPLOAD",
            entityType: "DOCUMENT",
            entityId: documentId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { title: docTitle, file_name: req.file.originalname, file_size: req.file.size }
        });

        await logActivity({
            documentId,
            userId: req.user.id,
            action: "UPLOADED",
            details: `Uploaded initial version of '${docTitle}'`
        });

        return res.status(201).json(successResponse("Document uploaded successfully.", {
            id: documentId,
            title: docTitle,
            category: docCategory,
            file_name: req.file.filename,
            original_file_name: req.file.originalname,
            file_size: req.file.size,
            version: 1
        }));
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        next(err);
    }
});

// PUT /api/documents/:id (Update document metadata)
router.put("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const permission = await getDocumentPermission(id, req.user);

        if (!permission || (!["ADMIN", "OWNER", "EDIT"].includes(permission))) {
            return next(new AppError("You do not have permission to edit this document.", 403));
        }

        const { title, category, description, expiry_date, tags, is_favorite } = req.body;

        const updates = [];
        const params = [];

        if (title !== undefined && title.trim()) {
            updates.push("title = ?");
            params.push(title.trim());
        }
        if (category !== undefined) {
            updates.push("category = ?");
            params.push(category);
        }
        if (description !== undefined) {
            updates.push("description = ?");
            params.push(description);
        }
        if (expiry_date !== undefined) {
            updates.push("expiry_date = ?");
            params.push(expiry_date ? expiry_date : null);
        }
        if (is_favorite !== undefined) {
            updates.push("is_favorite = ?");
            params.push(is_favorite ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(id);
            await pool.query(`UPDATE documents SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        // Update tags if provided
        if (tags !== undefined) {
            await pool.query("DELETE FROM document_tags WHERE document_id = ?", [id]);
            const tagList = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
            for (const tagName of tagList) {
                let [tRow] = await pool.query("SELECT id FROM tags WHERE name = ?", [tagName]);
                let tagId;
                if (tRow.length === 0) {
                    const [newTag] = await pool.query("INSERT INTO tags (name) VALUES (?)", [tagName]);
                    tagId = newTag.insertId;
                } else {
                    tagId = tRow[0].id;
                }
                await pool.query("INSERT IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)", [id, tagId]);
            }
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_UPDATE",
            entityType: "DOCUMENT",
            entityId: id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });

        await logActivity({
            documentId: id,
            userId: req.user.id,
            action: "METADATA_UPDATED",
            details: "Updated document metadata"
        });

        return res.json(successResponse("Document updated successfully."));
    } catch (err) {
        next(err);
    }
});

// DELETE /api/documents/:id (Delete document)
router.delete("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const permission = await getDocumentPermission(id, req.user);

        if (!permission || (!["ADMIN", "OWNER"].includes(permission))) {
            return next(new AppError("Only the document owner or an administrator can delete this document.", 403));
        }

        // Fetch files associated with this document and its versions to delete from storage
        const [docs] = await pool.query("SELECT file_name FROM documents WHERE id = ?", [id]);
        const [versions] = await pool.query("SELECT file_name FROM document_versions WHERE document_id = ?", [id]);

        const filesToDelete = new Set();
        if (docs[0]?.file_name) filesToDelete.add(docs[0].file_name);
        for (const v of versions) {
            if (v.file_name) filesToDelete.add(v.file_name);
        }

        // Delete DB record (foreign keys cascade to shares, versions, comments, tags)
        await pool.query("DELETE FROM documents WHERE id = ?", [id]);

        for (const fn of filesToDelete) {
            const filePath = path.join(UPLOADS_DIR, fn);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_DELETE",
            entityType: "DOCUMENT",
            entityId: id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });

        return res.json(successResponse("Document deleted successfully."));
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/:id/download (Download document)
router.get("/:id/download", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const permission = await getDocumentPermission(id, req.user);

        if (!permission || permission === "VIEW") {
            // Note: 'VIEW' does not grant download if restricted, but let's check
            if (permission === "VIEW") {
                return next(new AppError("You only have read-only view permission for this document.", 403));
            }
        }

        const [rows] = await pool.query("SELECT file_name, original_file_name, mime_type FROM documents WHERE id = ?", [id]);
        if (rows.length === 0 || !rows[0].file_name) {
            return next(new AppError("Document file not found.", 404));
        }

        const filePath = path.join(UPLOADS_DIR, rows[0].file_name);
        if (!fs.existsSync(filePath)) {
            return next(new AppError("Physical file is missing from storage.", 404));
        }

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "DOCUMENT_DOWNLOAD",
            entityType: "DOCUMENT",
            entityId: id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });

        await logActivity({
            documentId: id,
            userId: req.user.id,
            action: "DOWNLOADED",
            details: `Downloaded '${rows[0].original_file_name}'`
        });

        return res.download(filePath, rows[0].original_file_name);
    } catch (err) {
        next(err);
    }
});

// POST /api/documents/:id/favorite (Toggle favorite)
router.post("/:id/favorite", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [doc] = await pool.query("SELECT is_favorite FROM documents WHERE id = ?", [id]);
        if (doc.length === 0) {
            return next(new AppError("Document not found.", 404));
        }

        const newFav = doc[0].is_favorite ? 0 : 1;
        await pool.query("UPDATE documents SET is_favorite = ? WHERE id = ?", [newFav, id]);

        return res.json(successResponse("Favorite updated.", { is_favorite: Boolean(newFav) }));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
