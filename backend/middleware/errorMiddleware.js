const MYSQL_CONNECTION_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ER_CON_COUNT_ERROR",
    "PROTOCOL_CONNECTION_LOST",
    "ETIMEDOUT",
]);

const MYSQL_CONFLICT_ERROR_CODES = new Set([
    "ER_DUP_ENTRY",
    "ER_NO_REFERENCED_ROW_2",
    "ER_ROW_IS_REFERENCED_2",
]);

function getErrorDetails(error) {
    if (MYSQL_CONNECTION_ERROR_CODES.has(error.code)) {
        return { statusCode: 503, message: "Database service is unavailable." };
    }

    if (MYSQL_CONFLICT_ERROR_CODES.has(error.code)) {
        return { statusCode: 409, message: "The request conflicts with existing data." };
    }

    if (error.code?.startsWith("ER_") || error.code?.startsWith("PROTOCOL_")) {
        return { statusCode: 500, message: "A database error occurred." };
    }

    if (error.isOperational && Number.isInteger(error.statusCode)) {
        return {
            statusCode: error.statusCode,
            message: error.message,
        };
    }

    return { statusCode: 500, message: "An unexpected error occurred." };
}

function errorMiddleware(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    const { statusCode, message } = getErrorDetails(error);
    const response = {
        success: false,
        status: "error",
        message,
    };

    if (error.path && statusCode === 404) {
        response.path = error.path;
    }

    if (process.env.NODE_ENV === "development") {
        response.stack = error.stack;
    } else {
        const code = error.code || error.name || "Error";
        console.error(`[api-error] ${code} (${statusCode})`);
    }

    return res.status(statusCode).json(response);
}

module.exports = errorMiddleware;
