const mysql = require("mysql2/promise");

function getIntegerConfig(name, defaultValue, min, max) {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}.`);
    }

    return parsedValue;
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: getIntegerConfig("DB_PORT", 3306, 1, 65535),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "docunest_db",
    waitForConnections: true,
    connectionLimit: getIntegerConfig("DB_CONNECTION_LIMIT", 10, 1, 1000),
    queueLimit: 0,
});

async function testDatabaseConnection() {
    try {
        await pool.query("SELECT 1");
        console.log("[database] Connection check succeeded.");
        return true;
    } catch (error) {
        const errorCode = error.code || "UNKNOWN";
        console.error(
            `[database] Connection check failed (${errorCode}). Verify database availability and DB_* configuration.`,
        );
        return false;
    }
}

module.exports = { pool, testDatabaseConnection };
