const fs = require('fs').promises;
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
require('dotenv').config();

async function runMigration() {
  const sql = await fs.readFile(
    path.join(__dirname, 'migrations', '0009_fix_volume_column.sql'),
    'utf8'
  );

  const pool = neon(process.env.DATABASE_URL);
  const db = drizzle(pool);

  try {
    await db.execute(sql);
    console.log('Migração da coluna volume executada com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
