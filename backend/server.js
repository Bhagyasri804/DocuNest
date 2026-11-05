const express = require("express");
const cors = require("cors");
require("dotenv").config();
const validateEnv = require("./config/validateEnv");
validateEnv();

const { testDatabaseConnection } = require("./config/db");
const { initDatabase } = require("./models/initDb");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");
const requestLogger = require("./middleware/requestLogger");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();

// Enable CORS for frontend applications (Vite dev server and production)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting across API routes
app.use("/api", apiLimiter);

// Health check route
const healthRoutes = require("./routes/healthRoutes");
app.use("/api/health", healthRoutes);

// Auth & Users
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Documents & Categories & Tags
const documentRoutes = require("./routes/documentRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const tagRoutes = require("./routes/tagRoutes");
app.use("/api/documents", documentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);

// Shares, Versions, Comments
const shareRoutes = require("./routes/shareRoutes");
const versionRoutes = require("./routes/versionRoutes");
const commentRoutes = require("./routes/commentRoutes");
app.use("/api/shares", shareRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/comments", commentRoutes);

// Document Approvals Workflow
const approvalRoutes = require("./routes/approvalRoutes");
app.use("/api/approvals", approvalRoutes);

// Audit Logs & Analytics
const auditRoutes = require("./routes/auditRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
app.use("/api/audit-logs", auditRoutes);
app.use("/api/analytics", analyticsRoutes);

// Error handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, async () => {
    console.log(`DocuNest server running on port ${PORT}`);
    const dbOk = await testDatabaseConnection();
    if (dbOk) {
        await initDatabase();
    }
});

module.exports = app;
