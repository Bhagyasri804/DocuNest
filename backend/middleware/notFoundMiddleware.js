const AppError = require("../utils/AppError");

function notFoundMiddleware(req, res, next) {
    const error = new AppError("Route not found", 404);
    error.path = req.path;
    next(error);
}

module.exports = notFoundMiddleware;
