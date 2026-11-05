const express = require("express");
const { pool } = require("../config/db");
const { paginationResponse } = require("../utils/apiResponse");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles("ADMIN"));

// GET /api/audit-logs
router.get("/", async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
        const offset = (page - 1) * limit;

        const { action, status, search, from, to } = req.query;

        let whereSql = "WHERE 1=1";
        const params = [];

        if (action && action !== "All") {
            whereSql += " AND action = ?";
            params.push(action);
        }

        if (status && status !== "All") {
            whereSql += " AND status = ?";
            params.push(status);
        }

        if (search && search.trim()) {
            whereSql += " AND (user_email LIKE ? OR action LIKE ? OR details LIKE ?)";
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        if (from) {
            whereSql += " AND created_at >= ?";
            params.push(`${from} 00:00:00`);
        }

        if (to) {
            whereSql += " AND created_at <= ?";
            params.push(`${to} 23:59:59`);
        }

        const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereSql}`;
        const [c] = await pool.query(countSql, params);
        const total = c[0].total;

        const dataSql = `
            SELECT * FROM audit_logs
            ${whereSql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [logs] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json(paginationResponse(logs, page, limit, total, "Audit logs retrieved."));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
