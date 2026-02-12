import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const runMigration = async (migrationFile: string) => {
    try {
        console.log(`Running migration: ${migrationFile}`);

        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', migrationFile),
            'utf8'
        );

        await pool.query(sql);

        console.log(`✅ Migration ${migrationFile} completed successfully`);
    } catch (error) {
        console.error(`❌ Migration ${migrationFile} failed:`, error);
        throw error;
    }
};

const migrate = async () => {
    try {
        await runMigration('001_initial_schema.sql');
        console.log('✅ All migrations completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
