const REQUIRED_STRING_VARIABLES = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "JWT_SECRET",
];

function validateEnv(env = process.env) {
    const errors = [];
    const portValue = env.PORT;

    if (typeof portValue !== "string" || portValue.trim() === "") {
        errors.push("PORT is required.");
    } else if (!/^\d+$/.test(portValue.trim())) {
        errors.push("PORT must be a valid port number between 1 and 65535.");
    } else {
        const port = Number(portValue);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            errors.push("PORT must be a valid port number between 1 and 65535.");
        }
    }

    for (const name of REQUIRED_STRING_VARIABLES) {
        const value = env[name];
        if (typeof value !== "string" || value.trim() === "") {
            errors.push(`${name} is required and must not be empty.`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
    }
}

module.exports = validateEnv;
