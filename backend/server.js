const express = require("express");
require("dotenv").config();
const { testDatabaseConnection } = require("./config/db");

const app = express();

app.use(express.json());

// Health check route
const healthRoutes = require("./routes/healthRoutes");
app.use("/api/health", healthRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`DocuNest server running on port ${PORT}`);
    void testDatabaseConnection();
});

module.exports = app;