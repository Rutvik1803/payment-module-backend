import { QueryResult } from "pg";
import pool from "../config/database";

/**
 * Executes a database query using the connection pool.
 * @param text - The SQL query text.
 * @param params - Optional parameters for the SQL query.
 * @returns A promise that resolves to the query result.
 */


export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
Get a client from the pool for transactions
*/

export const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Set a timeout of 5 seconds to release the client if not done manually
    const timeout = setTimeout(() => {
        console.error('Client checked out for more than 5 seconds!');
        release();
    }, 5000);

    // Monkey patch the query method to clear the timeout on query completion
    client.query = ((...args: any[]) => {
        // @ts-ignore
        return query.apply(client, args);
    }) as typeof client.query;

    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    }

    return client;
}

export default { query, getClient };