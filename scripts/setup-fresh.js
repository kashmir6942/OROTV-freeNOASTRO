import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
  ssl: { rejectUnauthorized: false },
});

async function runSetup() {
  try {
    await client.connect();
    console.log('🚀 Setting up database...\n');

    const sqlPath = path.join(__dirname, '00-fresh-setup.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Setup SQL file not found');
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Execute entire script at once (Supabase handles the parsing)
    await client.query(sql);
    
    console.log('✅ Database setup completed successfully!');
    
    // List created tables
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log('\n📊 Tables created:');
    res.rows.forEach(r => console.log('  -', r.tablename));
    console.log(`\nTotal: ${res.rows.length} tables`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSetup();
