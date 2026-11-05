const AppError = require("../utils/AppError");

const VALID_TYPES = new Set(["string", "number", "boolean", "email"]);
const VALID_SOURCES = new Set(["body", "params", "query"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RULE_KEYS = new Set(["required", "type", "minLength", "maxLength"]);

function isBlank(value) {
    return value === undefined || value === null ||
        (typeof value === "string" && value.trim() === "");
}

function validateRuleConfiguration(rules) {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
        throw new TypeError("Validation rules must be an object.");
    }

    for (const [source, fields] of Object.entries(rules)) {
        if (!VALID_SOURCES.has(source)) {
            throw new TypeError(`Unsupported validation source "${source}".`);
        }
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            throw new TypeError(`Validation rules for "${source}" must be an object.`);
        }

        for (const [field, rule] of Object.entries(fields)) {
            if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
                throw new TypeError(`Validation rule for "${source}.${field}" must be an object.`);
            }

            for (const key of Object.keys(rule)) {
                if (!RULE_KEYS.has(key)) {
                    throw new TypeError(`Unsupported validation rule "${key}" for "${source}.${field}".`);
                }
            }

            if (rule.required !== undefined && typeof rule.required !== "boolean") {
                throw new TypeError(`The required rule for "${source}.${field}" must be a boolean.`);
            }
            if (rule.type !== undefined && !VALID_TYPES.has(rule.type)) {
                throw new TypeError(`Unsupported type "${rule.type}" for "${source}.${field}".`);
            }
            if ((rule.minLength !== undefined || rule.maxLength !== undefined) &&
                rule.type !== undefined && rule.type !== "string" && rule.type !== "email") {
                throw new TypeError(`Length rules for "${source}.${field}" require a string or email type.`);
            }

            for (const key of ["minLength", "maxLength"]) {
                if (rule[key] !== undefined &&
                    (!Number.isSafeInteger(rule[key]) || rule[key] < 0)) {
                    throw new TypeError(`${key} for "${source}.${field}" must be a non-negative integer.`);
                }
            }
            if (rule.minLength !== undefined && rule.maxLength !== undefined &&
                rule.minLength > rule.maxLength) {
                throw new TypeError(`minLength cannot exceed maxLength for "${source}.${field}".`);
            }
        }
    }
}

function matchesType(value, type, source) {
    switch (type) {
        case "string":
            return typeof value === "string";
        case "email":
            return typeof value === "string" && EMAIL_PATTERN.test(value);
        case "number":
            if (typeof value === "number") {
                return Number.isFinite(value);
            }
            return (source === "params" || source === "query") &&
                typeof value === "string" && Number.isFinite(Number(value));
        case "boolean":
            if (typeof value === "boolean") {
                return true;
            }
            return (source === "params" || source === "query") &&
                (value === "true" || value === "false");
        default:
            return false;
    }
}

function getTypeMessage(type) {
    if (type === "email") {
        return "must be a valid email address";
    }
    return `must be of type ${type}`;
}

/**
 * Creates Express middleware that validates configured body, params, and query fields.
 *
 * Each field rule can contain `required`, `type` (string, number, boolean, or email),
 * `minLength`, and `maxLength`. Numeric and boolean query/route params accept their
 * corresponding string representations; request data is validated without mutation.
 * Example: `validateRequest({ body: { email: { required: true, type: "email" } } })`.
 *
 * @param {{body?: object, params?: object, query?: object}} rules Validation schema.
 * @returns {import("express").RequestHandler}
 */
function validateRequest(rules = {}) {
    validateRuleConfiguration(rules);

    return function requestValidationMiddleware(req, res, next) {
        const errors = [];

        for (const [source, fields] of Object.entries(rules)) {
            const values = req[source] || {};

            for (const [field, rule] of Object.entries(fields)) {
                const value = values[field];
                const fieldName = `${source}.${field}`;

                if (isBlank(value)) {
                    if (rule.required) {
                        errors.push({ field: fieldName, message: "is required" });
                    }
                    continue;
                }

                if (rule.type && !matchesType(value, rule.type, source)) {
                    errors.push({ field: fieldName, message: getTypeMessage(rule.type) });
                    continue;
                }

                if ((rule.minLength !== undefined || rule.maxLength !== undefined) &&
                    typeof value !== "string") {
                    errors.push({ field: fieldName, message: "must be a string" });
                    continue;
                }

                if (typeof value === "string") {
                    if (rule.minLength !== undefined && value.length < rule.minLength) {
                        errors.push({
                            field: fieldName,
                            message: `must be at least ${rule.minLength} characters long`,
                        });
                    }
                    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                        errors.push({
                            field: fieldName,
                            message: `must be no more than ${rule.maxLength} characters long`,
                        });
                    }
                }
            }
        }

        if (errors.length > 0) {
            const error = new AppError("Request validation failed", 400);
            error.errors = errors;
            return next(error);
        }

        return next();
    };
}

module.exports = validateRequest;
