/**
 * Link Existing Invoices to Payment Schedules
 * 
 * This script fixes existing data where invoices were created but not linked
 * back to their corresponding payment schedules.
 * 
 * Usage: npx ts-node src/scripts/linkInvoicesToSchedules.ts
 */

import pool from '../config/database';

const linkInvoicesToSchedules = async () => {
    try {
        console.log('🔗 Starting invoice-schedule linking process...\n');

        // Verify database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connection verified\n');

        // Find all payment schedules without invoice_id
        const schedulesResult = await pool.query(`
            SELECT 
                ps.id,
                ps.payment_plan_id,
                ps.amount,
                ps.due_date,
                ps.installment_number
            FROM payment_schedules ps
            WHERE ps.invoice_id IS NULL
            ORDER BY ps.payment_plan_id, ps.installment_number
        `);

        const unlinkedSchedules = schedulesResult.rows;

        if (unlinkedSchedules.length === 0) {
            console.log('✅ All payment schedules are already linked to invoices!');
            process.exit(0);
        }

        console.log(`📋 Found ${unlinkedSchedules.length} payment schedules without linked invoices\n`);

        let linkedCount = 0;
        let notFoundCount = 0;

        // Process each unlinked schedule
        for (const schedule of unlinkedSchedules) {
            // Find matching invoice by payment_plan_id, amount, and due_date
            const invoiceResult = await pool.query(`
                SELECT id, invoice_number
                FROM invoices
                WHERE payment_plan_id = $1
                  AND amount = $2
                  AND due_date = $3
                LIMIT 1
            `, [schedule.payment_plan_id, schedule.amount, schedule.due_date]);

            if (invoiceResult.rows.length > 0) {
                const invoice = invoiceResult.rows[0];

                // Update the payment schedule with the invoice_id
                await pool.query(`
                    UPDATE payment_schedules
                    SET invoice_id = $1
                    WHERE id = $2
                `, [invoice.id, schedule.id]);

                linkedCount++;
                console.log(`✅ Linked schedule ${schedule.id} (Plan: ${schedule.payment_plan_id}, Installment: ${schedule.installment_number}) → Invoice ${invoice.invoice_number}`);
            } else {
                notFoundCount++;
                console.log(`⚠️  No matching invoice found for schedule ${schedule.id} (Plan: ${schedule.payment_plan_id}, Amount: $${schedule.amount}, Due: ${schedule.due_date})`);
            }
        }

        // Show summary
        console.log('\n📊 Linking Summary:');
        console.log('='.repeat(50));
        console.log(`✅ Successfully linked: ${linkedCount}`);
        console.log(`⚠️  No match found: ${notFoundCount}`);
        console.log(`📋 Total processed: ${unlinkedSchedules.length}`);

        // Verify the results
        const verifyResult = await pool.query(`
            SELECT 
                COUNT(*) as total_schedules,
                COUNT(invoice_id) as linked_schedules,
                COUNT(*) - COUNT(invoice_id) as unlinked_schedules
            FROM payment_schedules
        `);

        console.log('\n📈 Database Totals:');
        console.table(verifyResult.rows[0]);

        console.log('\n✨ Invoice-schedule linking complete!\n');
        console.log('💡 Tip: Now when you mark an invoice as paid, the payment schedule will also update automatically.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error linking invoices to schedules:', error);
        process.exit(1);
    }
};

linkInvoicesToSchedules();
