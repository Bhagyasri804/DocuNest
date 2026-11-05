const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { logAudit } = require("../utils/auditLogger");

const router = express.Router();

router.use(authenticateToken);

// GET /api/users/profile
router.get("/profile", async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, status, profile_image, created_at, updated_at FROM users WHERE id = ?",
            [req.user.id]
        );
        if (rows.length === 0) {
            return next(new AppError("User not found.", 404));
        }
        return res.json(successResponse("Profile retrieved successfully.", rows[0]));
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/profile
router.put("/profile", async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return next(new AppError("Name cannot be empty.", 400));
        }

        await pool.query("UPDATE users SET name = ? WHERE id = ?", [name.trim(), req.user.id]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "USER_PROFILE_UPDATE",
            entityType: "USER",
            entityId: req.user.id,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { name: name.trim() }
        });

        const [rows] = await pool.query(
            "SELECT id, name, email, role, status, profile_image FROM users WHERE id = ?",
            [req.user.id]
        );

        return res.json(successResponse("Profile updated successfully.", rows[0]));
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/password
router.put("/password", async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return next(new AppError("Both current password and new password are required.", 400));
        }

        if (newPassword.length < 8) {
            return next(new AppError("New password must be at least 8 characters long.", 400));
        }
        if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return next(new AppError("New password must contain at least one letter and one number.", 400));
        }

        const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
        if (rows.length === 0) {
            return next(new AppError("User not found.", 404));
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!isMatch) {
            return next(new AppError("Incorrect current password.", 400));
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "USER_PASSWORD_CHANGE",
            entityType: "USER",
            entityId: req.user.id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });

        return res.json(successResponse("Password updated successfully."));
    } catch (err) {
        next(err);
    }
});

// GET /api/users (ADMIN & MANAGER, or any authenticated user for sharing search)
router.get("/", async (req, res, next) => {
    try {
        const query = req.query.q ? `%${req.query.q.trim()}%` : null;
        let sql = "SELECT id, name, email, role, status, created_at FROM users";
        const params = [];

        if (query) {
            sql += " WHERE (name LIKE ? OR email LIKE ?)";
            params.push(query, query);
        }

        sql += " ORDER BY name ASC";
        const [rows] = await pool.query(sql, params);

        return res.json(successResponse("Users retrieved successfully.", rows));
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/:id/role (ADMIN only)
router.put("/:id/role", authorizeRoles("ADMIN"), async (req, res, next) => {
    try {
        const targetId = Number(req.params.id);
        const { role } = req.body;

        if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
            return next(new AppError("Invalid role. Must be ADMIN, MANAGER, or EMPLOYEE.", 400));
        }

        if (targetId === req.user.id && role !== "ADMIN") {
            return next(new AppError("You cannot remove your own ADMIN role.", 400));
        }

        await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, targetId]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "USER_ROLE_CHANGE",
            entityType: "USER",
            entityId: targetId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { newRole: role }
        });

        return res.json(successResponse("User role updated successfully."));
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/:id/status (ADMIN only)
router.put("/:id/status", authorizeRoles("ADMIN"), async (req, res, next) => {
    try {
        const targetId = Number(req.params.id);
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
            return next(new AppError("Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED.", 400));
        }

        if (targetId === req.user.id && status !== "ACTIVE") {
            return next(new AppError("You cannot deactivate or suspend your own account.", 400));
        }

        await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, targetId]);

        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "USER_STATUS_CHANGE",
            entityType: "USER",
            entityId: targetId,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { newStatus: status }
        });

        return res.json(successResponse("User status updated successfully."));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
