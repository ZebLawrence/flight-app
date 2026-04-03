import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(__dirname, '..', 'drizzle');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const sql = postgres(DATABASE_URL!, { max: 1, connect_timeout: 5 });
    try {
      console.log(`Migration attempt ${attempt}/${MAX_RETRIES}...`);
      const db = drizzle(sql);
      await migrate(db, { migrationsFolder });
      console.log('Database migrations completed successfully.');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Attempt ${attempt} failed: ${message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    } finally {
      await sql.end({ timeout: 5 }).catch(() => {});
    }
  }

  console.error(`Migration failed after ${MAX_RETRIES} attempts. Exiting.`);
  process.exit(1);
}

runMigrations();
