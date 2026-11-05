const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { pool } = require("../config/db");

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("Authentication required. Please log in.", 401));
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(new AppError("Authentication token is missing.", 401));
        }

        const secret = process.env.JWT_SECRET || "docunest_secret";
        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return next(new AppError("Session has expired. Please log in again.", 401));
            }
            return next(new AppError("Invalid authentication token.", 401));
        }

        // Verify user still exists and is active
        const [rows] = await pool.query(
            "SELECT id, name, email, role, status FROM users WHERE id = ?",
            [decoded.id]
        );

        if (!rows || rows.length === 0) {
            return next(new AppError("User account no longer exists.", 401));
        }

        const user = rows[0];
        if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
            return next(new AppError("Account is inactive or suspended. Please contact support.", 403));
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (err) {
        next(err);
    }
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError("Authentication required.", 401));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError("You do not have permission to perform this action.", 403));
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };
