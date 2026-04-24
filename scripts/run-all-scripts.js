import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  console.error('❌ Missing POSTGRES_URL environment variable');
  process.exit(1);
}

const client = new Client({
  connectionString: postgresUrl,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 60000,
  statement_timeout: 60000,
  ssl: {
    rejectUnauthorized: false,
  },
});

// All SQL scripts in order
const sqlFiles = [
  '01-create-tables.sql',
  '02-insert-permanent-token.sql',
  '03-add-permanent-tokens.sql',
  '003_create_phcorner_usernames.sql',
  '04-create-increment-function.sql',
  '05-create-admin-tables.sql',
  '06-create-admin-functions.sql',
  '07-insert-default-data.sql',
  '08-enable-rls.sql',
  '09-fix-onn-overlay.sql',
  '10-delete-welcome-onn-announcement.sql',
  '11-delete-welcome-onn-banner.sql',
  '13-remove-stream-status-add-new-features.sql',
  '14-update-analytics-function.sql',
  '15-create-admin-panel-tables.sql',
  '16-fix-usage-tracking.sql',
  '17-add-auto-dismiss-column.sql',
  '17-fix-channel-analytics-schema.sql',
  '18-create-active-sessions-table.sql',
  '19-create-session-functions.sql',
  '20-fix-session-functions.sql',
  '21-add-viewers-column.sql',
  '21-replace-usage-with-viewers.sql',
  '22-create-maintenance-mode-table.sql',
  '22-create-viewer-functions.sql',
  '23-fix-viewer-tracking-system.sql',
  '24-fix-viewer-analytics-functions.sql',
  '25-create-video-positions-table.sql',
  '26-add-password-to-phcorner.sql',
  '27-migrate-phcorner-to-passwords.sql',
  '28-create-user-preferences-table.sql',
  '29-add-token-security-features.sql',
  '29-create-user-accounts.sql',
  '30-create-playlist-tables.sql',
  '31-create-playlist-tables-fixed.sql',
  '32-create-channel-requests-table.sql',
  '33-create-shared-folders-collections.sql',
  'create-folders-favorites.sql',
];

async function runMigrations() {
  try {
    await client.connect();
    console.log('🚀 Running all SQL scripts...\n');
    
    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${file} (not found)`);
        skippedCount++;
        continue;
      }

      try {
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        // Split by semicolon and filter empty statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        if (statements.length === 0) {
          console.log(`⏭️  Skipping ${file} (no valid statements)`);
          skippedCount++;
          continue;
        }

        for (const statement of statements) {
          try {
            await client.query(statement);
          } catch (error) {
            // Ignore "already exists" errors as these are idempotent operations
            if (!error.message.includes('already exists') && 
                !error.message.includes('duplicate key') &&
                !error.message.includes('Duplicate') &&
                !error.message.includes('UNIQUE violation')) {
              console.warn(`⚠️  Warning in ${file}: ${error.message}`);
            }
          }
        }

        console.log(`✅ ${file}`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${file}: ${error.message}`);
        failureCount++;
      }
    }

    console.log(`\n📊 Results: ${successCount} executed, ${skippedCount} skipped, ${failureCount} failed`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
