import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Extract pagination parameters from request query
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
  const requestedLimit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create paginated response
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
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
export function buildPaginationClause(params: PaginationParams): string {
  return `LIMIT ${params.limit} OFFSET ${params.offset}`;
}

/**
 * Parse sort parameters from request
 */
export function getSortParams(
  req: Request,
  allowedFields: string[],
  defaultField: string = 'created_at',
  defaultOrder: 'ASC' | 'DESC' = 'DESC'
): { field: string; order: 'ASC' | 'DESC' } {
  const sortField = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string)?.toUpperCase();

  const field = allowedFields.includes(sortField) ? sortField : defaultField;
  const order = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : defaultOrder;

  return { field, order };
}

/**
 * Build SQL ORDER BY clause
 */
export function buildSortClause(
  field: string,
  order: 'ASC' | 'DESC',
  fieldMapping: Record<string, string> = {}
): string {
  const dbField = fieldMapping[field] || field;
  return `ORDER BY ${dbField} ${order}`;
}
