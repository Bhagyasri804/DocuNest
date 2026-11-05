/**
 * Builds a standard successful API response.
 * Undefined data is represented as null; absent metadata is omitted.
 *
 * @param {string} [message="Request successful"] Human-readable result message.
 * @param {*} [data=null] Response payload.
 * @param {object} [meta] Optional response metadata.
 * @returns {{success: true, message: string, data: *, meta?: object}}
 */
function successResponse(message = "Request successful", data = null, meta) {
    const response = {
        success: true,
        message: typeof message === "string" && message.trim()
            ? message
            : "Request successful",
        data: data === undefined ? null : data,
    };

    if (meta !== undefined && meta !== null) {
        response.meta = meta;
    }

    return response;
}

/**
 * Builds a standard successful paginated API response.
 *
 * @param {Array} data Page items; non-array or missing values become an empty array.
 * @param {number} currentPage Requested one-based page number.
 * @param {number} pageSize Maximum items per page.
 * @param {number} totalItems Total number of matching items.
 * @param {string} [message="Request successful"] Human-readable result message.
 * @returns {{success: true, message: string, data: Array, currentPage: number, pageSize: number, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean}}
 */
function paginationResponse(
    data,
    currentPage = 1,
    pageSize = 10,
    totalItems = 0,
    message = "Request successful",
) {
    const safeCurrentPage = Number.isSafeInteger(Number(currentPage)) && Number(currentPage) > 0
        ? Number(currentPage)
        : 1;
    const safePageSize = Number.isSafeInteger(Number(pageSize)) && Number(pageSize) > 0
        ? Number(pageSize)
        : 10;
    const safeTotalItems = Number.isSafeInteger(Number(totalItems)) && Number(totalItems) >= 0
        ? Number(totalItems)
        : 0;
    const totalPages = Math.ceil(safeTotalItems / safePageSize);

    return {
        success: true,
        message: typeof message === "string" && message.trim()
            ? message
            : "Request successful",
        data: Array.isArray(data) ? data : [],
        currentPage: safeCurrentPage,
        pageSize: safePageSize,
        totalItems: safeTotalItems,
        totalPages,
        hasNextPage: safeCurrentPage < totalPages,
        hasPreviousPage: safeCurrentPage > 1,
    };
}

module.exports = { successResponse, paginationResponse };
