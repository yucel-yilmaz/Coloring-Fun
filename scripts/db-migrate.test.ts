import { describe, expect, it } from 'vitest';
import { isDuplicateObjectError, listMigrationFiles, pendingMigrations } from './db-migrate';

describe('pendingMigrations', () => {
  it('returns files not yet recorded as applied, in order', () => {
    const all = ['a.sql', 'b.sql', 'c.sql'];
    expect(pendingMigrations(all, new Set(['a.sql']))).toEqual(['b.sql', 'c.sql']);
  });

  it('returns nothing when all are applied', () => {
    const all = ['a.sql', 'b.sql'];
    expect(pendingMigrations(all, new Set(['a.sql', 'b.sql']))).toEqual([]);
  });
});

describe('isDuplicateObjectError', () => {
  it('recognises "already exists" SQLSTATE codes so an existing DB can be baselined', () => {
    expect(isDuplicateObjectError({ code: '42P07' })).toBe(true); // duplicate_table
    expect(isDuplicateObjectError({ code: '42710' })).toBe(true); // duplicate_object
  });

  it('does not treat unrelated errors as duplicates', () => {
    expect(isDuplicateObjectError({ code: '23505' })).toBe(false); // unique_violation
    expect(isDuplicateObjectError(new Error('boom'))).toBe(false);
    expect(isDuplicateObjectError(null)).toBe(false);
  });
});

describe('listMigrationFiles', () => {
  it('lists the repo migrations sorted, including the new slug-category one', () => {
    const files = listMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files).toEqual([...files].sort());
    expect(files).toContain('202607140001_flexible_catalog_categories.sql');
  });
});
