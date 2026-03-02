/**
 * Reset Payment Data Script
 * 
 * Safely deletes all payment-related data while keeping users intact:
 * - Transactions
 * - Invoices
 * - Payment Schedules
 * - Payment Plans
 * 
 * Usage: npx ts-node src/scripts/resetPaymentData.ts
 */

import pool from '../config/database';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askConfirmation = (): Promise<boolean> => {
    return new Promise((resolve) => {
        rl.question(
            '\n⚠️  WARNING: This will DELETE ALL payment data (transactions, invoices, schedules, plans).\n' +
            'User data will be preserved.\n' +
            'Are you sure you want to continue? (yes/no): ',
            (answer) => {
                resolve(answer.toLowerCase() === 'yes');
            }
        );
    });
};

const resetPaymentData = async () => {
    try {
        console.log('\n🔍 Checking current data...\n');

        // Show current counts
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM transactions) as transactions,
                (SELECT COUNT(*) FROM invoices) as invoices,
                (SELECT COUNT(*) FROM payment_schedules) as payment_schedules,
                (SELECT COUNT(*) FROM payment_plans) as payment_plans,
                (SELECT COUNT(*) FROM users) as users
        `);

        console.log('Current record counts:');
        console.table(counts.rows[0]);

        // Ask for confirmation
        const confirmed = await askConfirmation();
        rl.close();

        if (!confirmed) {
            console.log('\n❌ Operation cancelled by user.');
            process.exit(0);
        }

        console.log('\n🗑️  Deleting payment data...\n');

        // Delete in correct order (respecting foreign key constraints)
        await pool.query('DELETE FROM transactions');
        console.log('✅ Deleted all transactions');

        await pool.query('DELETE FROM invoice_fees');
        console.log('✅ Deleted all invoice fees');

        await pool.query('DELETE FROM payment_schedules');
        console.log('✅ Deleted all payment schedules');

        await pool.query('DELETE FROM invoices');
        console.log('✅ Deleted all invoices');

        await pool.query('DELETE FROM payment_plans');
        console.log('✅ Deleted all payment plans');

        await pool.query('DELETE FROM payment_methods');
        console.log('✅ Deleted all payment methods');

        // Reset sequences for clean IDs
        await pool.query('ALTER SEQUENCE transactions_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE invoices_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE payment_schedules_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE payment_plans_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE payment_methods_id_seq RESTART WITH 1');
        console.log('✅ Reset all ID sequences');

        // Show final counts
        const finalCounts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM transactions) as transactions,
                (SELECT COUNT(*) FROM invoices) as invoices,
                (SELECT COUNT(*) FROM payment_schedules) as payment_schedules,
                (SELECT COUNT(*) FROM payment_plans) as payment_plans,
                (SELECT COUNT(*) FROM users) as users
        `);

        console.log('\n📊 Final record counts:');
        console.table(finalCounts.rows[0]);

        console.log('\n✅ Payment data reset complete! User data preserved.');
        console.log('💡 Run "npm run seed:payment-data" to generate test data.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error resetting payment data:', error);
        rl.close();
        process.exit(1);
    }
};

resetPaymentData();
