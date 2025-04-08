import { Pool } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_lQbe0J4qHFZV@ep-black-silence-a5sez3bu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  try {
    // Ler o arquivo de migração
    const migrationSQL = await fs.readFile(
      path.join(__dirname, 'migrations', '0011_remove_volume_from_freight_requests.sql'),
      'utf-8'
    );

    // Executar a migração
    await pool.query(migrationSQL);
    console.log('Migração executada com sucesso!');

  } catch (error) {
    console.error('Erro ao executar migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration(); 