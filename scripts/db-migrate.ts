/**
 * Applies pending SQL migrations in `supabase/migrations/` against a Postgres database, tracked in a
 * `schema_migrations` table so each file runs exactly once.
 *
 * Adopting an existing database (whose migrations were applied manually before this tool existed) is
 * safe: a migration whose objects already exist fails with a duplicate-object error, which is caught
 * and recorded as already-applied ("baselined") instead of aborting. New migrations should be written
 * idempotently so they apply cleanly on both fresh and adopted databases.
 *
 * Usage:  SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" npm run db:migrate
 * The URL is the Supabase project's *direct* Postgres connection string (Project Settings → Database).
 */
import { config as loadEnv } from 'dotenv';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

loadEnv({ path: '.env.local' });
loadEnv();

export const MIGRATIONS_DIR = path.resolve(process.cwd(), process.env.MIGRATIONS_DIR || 'supabase/migrations');

/** Postgres SQLSTATE codes meaning "this object already exists" — used to baseline an adopted DB. */
export const DUPLICATE_OBJECT_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (type, constraint, policy, trigger, ...)
  '42P06', // duplicate_schema
  '42723', // duplicate_function
  '42701', // duplicate_column
  '42P04', // duplicate_database
  '42P16', // invalid_table_definition (e.g. constraint already exists)
]);

export function isDuplicateObjectError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && DUPLICATE_OBJECT_CODES.has((error as { code?: string }).code ?? '');
}

export function listMigrationFiles(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

export function pendingMigrations(all: string[], applied: Set<string>): string[] {
  return all.filter((file) => !applied.has(file));
}

async function run(): Promise<void> {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    // Not an error: this lets the runner sit harmlessly in the deploy pipeline until a
    // connection string is configured. Provide SUPABASE_DB_URL to actually run migrations.
    console.log('SUPABASE_DB_URL is not set — skipping migrations.');
    return;
  }

  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const client = new Client({
    connectionString,
    // Supabase (and most hosted Postgres) require TLS; the cert chain isn't verifiable from here.
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(
      'create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())',
    );
    const { rows } = await client.query<{ name: string }>('select name from public.schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const pending = pendingMigrations(listMigrationFiles(), applied);

    if (pending.length === 0) {
      console.log('No pending migrations — database is up to date.');
      return;
    }
    console.log(`${pending.length} pending migration(s): ${pending.join(', ')}`);

    for (const file of pending) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into public.schema_migrations(name) values ($1) on conflict do nothing', [file]);
        await client.query('commit');
        console.log(`  ✔ applied ${file}`);
      } catch (error) {
        await client.query('rollback');
        if (isDuplicateObjectError(error)) {
          await client.query('insert into public.schema_migrations(name) values ($1) on conflict do nothing', [file]);
          console.log(`  • baselined ${file} (objects already exist)`);
        } else {
          console.error(`  ✖ failed ${file}: ${(error as Error).message}`);
          throw error;
        }
      }
    }
    console.log('Migrations complete.');
  } finally {
    await client.end();
  }
}

// Run only when invoked directly as the entrypoint (dev: scripts/db-migrate.ts, prod bundle:
// dist/migrate.cjs) — not when the helpers are imported by tests, whose argv[1] is the test runner.
if (process.argv[1] && /(?:db-)?migrate(?:\.[cm]?[jt]s)?$/.test(path.resolve(process.argv[1]))) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
