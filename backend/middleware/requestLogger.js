function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();
    const requestPath = (req.path || "/").split(/[?#]/, 1)[0].replace(
        /(?:^|\/)eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+(?=\/|$)/g,
        "/[REDACTED]",
    );

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const timestamp = new Date().toISOString();
        console.log(
            `[${timestamp}] ${req.method} ${requestPath} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
        );
    });

    next();
}

module.exports = requestLogger;
