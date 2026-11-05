const { pool } = require("../config/db");

async function logAudit({
    userId = null,
    userEmail = null,
    action,
    entityType = null,
    entityId = null,
    ipAddress = null,
    status = "SUCCESS",
    details = null
}) {
    try {
        const detailsStr = typeof details === "object" ? JSON.stringify(details) : details;
        await pool.query(
            "INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, ip_address, status, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, userEmail, action, entityType, entityId, ipAddress, status, detailsStr]
        );
    } catch (err) {
        console.error("[audit] Failed to write audit log:", err.message);
    }
}

async function logActivity({
    documentId = null,
    userId,
    action,
    details = null
}) {
    try {
        const detailsStr = typeof details === "object" ? JSON.stringify(details) : details;
        await pool.query(
            "INSERT INTO activity_logs (document_id, user_id, action, details) VALUES (?, ?, ?, ?)",
            [documentId, userId, action, detailsStr]
        );
    } catch (err) {
        console.error("[activity] Failed to write activity log:", err.message);
    }
}

module.exports = { logAudit, logActivity };
