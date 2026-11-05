const express = require("express");
require("dotenv").config();
const validateEnv = require("./config/validateEnv");
validateEnv();

const { testDatabaseConnection } = require("./config/db");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json());

// Health check route
const healthRoutes = require("./routes/healthRoutes");
app.use("/api/health", healthRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
    console.log(`DocuNest server running on port ${PORT}`);
    void testDatabaseConnection();
});

module.exports = app;