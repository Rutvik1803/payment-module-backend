import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
})

// Test the database connection
pool.on('connect', () => {
    console.log('✅ Connected to the database');
})

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1); // Exit the application on database error
})

// Test connection immediately
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✅ Database connection verified');
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err.message);
    });

export default pool;