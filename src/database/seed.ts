import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const runSeed = async (seedFile: string) => {
  try {
    console.log(`Running seed: ${seedFile}`);
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'seeds', seedFile),
      'utf8'
    );

    const result = await pool.query(sql);
    
    console.log(`✅ Seed ${seedFile} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Seed ${seedFile} failed:`, error);
    throw error;
  }
};

const seed = async () => {
  try {
    await runSeed('001_users_seed.sql');
    
    // Show inserted users
    const users = await pool.query('SELECT id, email, first_name, last_name, role FROM users ORDER BY id');
    console.log('\n📋 Seeded users:');
    console.table(users.rows);
    
    console.log('\n✅ All seeds completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
