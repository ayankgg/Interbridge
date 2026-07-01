import { getPagination, buildMeta, getCursorParams, buildCursorMeta } from '../../src/utils/pagination';

describe('getPagination', () => {
  it('defaults to page 1, limit 20', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(getPagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('caps limit at 100 and floors invalid input', () => {
    expect(getPagination({ limit: '500' }).limit).toBe(100);
    expect(getPagination({ page: '-2', limit: 'abc' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});

describe('buildMeta', () => {
  it('computes totalPages and never returns 0', () => {
    expect(buildMeta(1, 20, 45)).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
    expect(buildMeta(1, 20, 0).totalPages).toBe(1);
  });
});

describe('cursor pagination', () => {
  it('parses cursor params with bounds', () => {
    expect(getCursorParams({ limit: '5', cursor: 'abc' })).toEqual({ limit: 5, cursor: 'abc' });
    expect(getCursorParams({ limit: '9999' }).limit).toBe(100);
  });

  it('returns nextCursor only when more items exist', () => {
    const items = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
    const withMore = buildCursorMeta(items, 2);
    expect(withMore.hasMore).toBe(true);
    expect(withMore.page).toHaveLength(2);
    expect(withMore.nextCursor).toBe('b');

    const noMore = buildCursorMeta(items, 5);
    expect(noMore.hasMore).toBe(false);
    expect(noMore.nextCursor).toBeNull();
  });
});
