export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(query: { page?: unknown; limit?: unknown }): PaginationParams {
  let page = parseInt(String(query.page ?? '1'), 10);
  let limit = parseInt(String(query.limit ?? '20'), 10);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Cursor (keyset) pagination for infinite scroll. Unlike skip/limit it stays
 * O(limit) at any depth and is stable under inserts. The cursor is the _id of
 * the last item from the previous page; results are ordered by _id descending.
 */
export interface CursorParams {
  limit: number;
  cursor?: string;
}

export function getCursorParams(query: { limit?: unknown; cursor?: unknown }): CursorParams {
  let limit = parseInt(String(query.limit ?? '20'), 10);
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const cursor = query.cursor ? String(query.cursor) : undefined;
  return { limit, cursor };
}

export function buildCursorMeta<T extends { _id: unknown }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;
  return { page, nextCursor, hasMore };
}
