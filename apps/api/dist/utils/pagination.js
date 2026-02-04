"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationParams = getPaginationParams;
exports.createPaginatedResult = createPaginatedResult;
exports.buildPaginationClause = buildPaginationClause;
exports.getSortParams = getSortParams;
exports.buildSortClause = buildSortClause;
/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
/**
 * Extract pagination parameters from request query
 */
function getPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const requestedLimit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}
/**
 * Create paginated response
 */
function createPaginatedResult(data, total, params) {
    const { page, limit } = params;
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * Build SQL pagination clause
 */
function buildPaginationClause(params) {
    return `LIMIT ${params.limit} OFFSET ${params.offset}`;
}
/**
 * Parse sort parameters from request
 */
function getSortParams(req, allowedFields, defaultField = 'created_at', defaultOrder = 'DESC') {
    var _a;
    const sortField = req.query.sortBy;
    const sortOrder = (_a = req.query.sortOrder) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    const field = allowedFields.includes(sortField) ? sortField : defaultField;
    const order = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : defaultOrder;
    return { field, order };
}
/**
 * Build SQL ORDER BY clause
 */
function buildSortClause(field, order, fieldMapping = {}) {
    const dbField = fieldMapping[field] || field;
    return `ORDER BY ${dbField} ${order}`;
}
