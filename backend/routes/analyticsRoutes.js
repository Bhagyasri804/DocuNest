const express = require("express");
const { pool } = require("../config/db");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

// GET /api/analytics/dashboard
router.get("/dashboard", async (req, res, next) => {
    try {
        const isAdmin = req.user.role === "ADMIN";

        // Filter condition based on user role
        const docFilter = isAdmin ? "1=1" : "user_id = " + pool.escape(req.user.id);

        // 1. Total documents & storage
        const [docStats] = await pool.query(`
            SELECT COUNT(*) as total_documents, COALESCE(SUM(file_size), 0) as total_size_bytes
            FROM documents
            WHERE ${docFilter}
        `);

        // 2. Total active users (if admin) or personal shared docs
        const [userStats] = await pool.query("SELECT COUNT(*) as total_users FROM users WHERE status = 'ACTIVE'");

        // 3. Category distribution
        const [categoryDistribution] = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM documents
            WHERE ${docFilter}
            GROUP BY category
            ORDER BY count DESC
        `);

        // 4. Monthly uploads trend (last 6 months)
        const [monthlyUploads] = await pool.query(`
            SELECT DATE_FORMAT(created_at, '%b %Y') as month, COUNT(*) as count
            FROM documents
            WHERE ${docFilter} AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month, YEAR(created_at), MONTH(created_at)
            ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
        `);

        // 5. Recent activities
        const [recentActivity] = await pool.query(`
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM activity_logs a
            JOIN users u ON u.id = a.user_id
            ${isAdmin ? "" : "WHERE a.user_id = " + pool.escape(req.user.id)}
            ORDER BY a.created_at DESC
            LIMIT 10
        `);

        return res.json(successResponse("Analytics data retrieved.", {
            totalDocuments: docStats[0].total_documents || 0,
            totalSizeBytes: Number(docStats[0].total_size_bytes) || 0,
            totalUsers: userStats[0].total_users || 0,
            categoryDistribution,
            monthlyUploads,
            recentActivity
        }));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
