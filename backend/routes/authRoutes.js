const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/apiResponse");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { logAudit } = require("../utils/auditLogger");

const router = express.Router();

function generateToken(user) {
    const secret = process.env.JWT_SECRET || "docunest_secret";
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        secret,
        { expiresIn: "7d" }
    );
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim()) {
            return next(new AppError("Name is required.", 400));
        }
        if (!email || !email.trim()) {
            return next(new AppError("Email is required.", 400));
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return next(new AppError("Please provide a valid email address.", 400));
        }

        if (!password || password.length < 8) {
            return next(new AppError("Password must be at least 8 characters long.", 400));
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return next(new AppError("Password must contain at least one letter and one number.", 400));
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check duplicate email
        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
        if (existing.length > 0) {
            return next(new AppError("An account with this email address already exists.", 409));
        }

        // Check if this is the first user ever; if so, make ADMIN, otherwise EMPLOYEE
        const [countRow] = await pool.query("SELECT COUNT(*) as count FROM users");
        const role = countRow[0].count === 0 ? "ADMIN" : "EMPLOYEE";

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
            [name.trim(), normalizedEmail, passwordHash, role]
        );

        const newUser = {
            id: result.insertId,
            name: name.trim(),
            email: normalizedEmail,
            role,
        };

        const token = generateToken(newUser);

        await logAudit({
            userId: newUser.id,
            userEmail: newUser.email,
            action: "USER_REGISTER",
            entityType: "USER",
            entityId: newUser.id,
            ipAddress: req.ip,
            status: "SUCCESS",
            details: { name: newUser.name, role: newUser.role }
        });

        return res.status(201).json(successResponse("Account registered successfully.", {
            token,
            user: newUser
        }));
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) {
            return next(new AppError("Email is required.", 400));
        }
        if (!password) {
            return next(new AppError("Password is required.", 400));
        }

        const normalizedEmail = email.trim().toLowerCase();
        const [rows] = await pool.query(
            "SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (rows.length === 0) {
            await logAudit({
                userEmail: normalizedEmail,
                action: "USER_LOGIN_FAILED",
                ipAddress: req.ip,
                status: "FAILURE",
                details: "Invalid email"
            });
            return next(new AppError("Invalid email or password.", 401));
        }

        const user = rows[0];

        if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
            return next(new AppError("Your account has been deactivated or suspended. Please contact your administrator.", 403));
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await logAudit({
                userId: user.id,
                userEmail: user.email,
                action: "USER_LOGIN_FAILED",
                entityType: "USER",
                entityId: user.id,
                ipAddress: req.ip,
                status: "FAILURE",
                details: "Incorrect password"
            });
            return next(new AppError("Invalid email or password.", 401));
        }

        const token = generateToken(user);

        await logAudit({
            userId: user.id,
            userEmail: user.email,
            action: "USER_LOGIN",
            entityType: "USER",
            entityId: user.id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });

        return res.json(successResponse("Login successful.", {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }));
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/logout
router.post("/logout", authenticateToken, async (req, res, next) => {
    try {
        await logAudit({
            userId: req.user.id,
            userEmail: req.user.email,
            action: "USER_LOGOUT",
            entityType: "USER",
            entityId: req.user.id,
            ipAddress: req.ip,
            status: "SUCCESS"
        });
        return res.json(successResponse("Logout successful."));
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, status, profile_image, created_at FROM users WHERE id = ?",
            [req.user.id]
        );
        if (rows.length === 0) {
            return next(new AppError("User not found.", 404));
        }
        return res.json(successResponse("User details fetched.", rows[0]));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
