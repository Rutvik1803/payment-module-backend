/**
 * Seed Payment Test Data
 * 
 * Generates 30 test payment plans with:
 * - Mix of ONE_TIME and INSTALLMENT plans
 * - Automatic invoice generation
 * - Admin-focused data (all plans visible to admin)
 * 
 * Usage: npx ts-node src/scripts/seedPaymentData.ts
 */

import pool from '../config/database';
import * as paymentPlanService from '../services/paymentPlanService';
import { PaymentPlanType } from '../types/paymentPlan';

const seedPaymentData = async () => {
    try {
        console.log('\n🌱 Starting payment data seeding...\n');

        // Get all users
        const usersResult = await pool.query(
            'SELECT id, email, first_name, last_name, role FROM users ORDER BY id'
        );

        const users = usersResult.rows;

        if (users.length === 0) {
            console.error('❌ No users found. Please run user seed first.');
            process.exit(1);
        }

        console.log(`📋 Found ${users.length} users`);
        console.log(`   Admin users: ${users.filter(u => u.role === 'admin').length}`);
        console.log(`   Student users: ${users.filter(u => u.role === 'student').length}\n`);

        // Test data configurations
        const testPlans = [
            // ONE_TIME plans (10 plans)
            { user_index: 0, amount: 500, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 1, amount: 1200, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 2, amount: 800, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 0, amount: 1500, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 1, amount: 950, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 2, amount: 600, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 0, amount: 2000, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 1, amount: 750, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 2, amount: 1100, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },
            { user_index: 0, amount: 3000, type: 'ONE_TIME' as PaymentPlanType, installments: 1 },

            // INSTALLMENT plans (20 plans with varying installments)
            { user_index: 1, amount: 3000, type: 'INSTALLMENT' as PaymentPlanType, installments: 3 },
            { user_index: 2, amount: 4500, type: 'INSTALLMENT' as PaymentPlanType, installments: 3 },
            { user_index: 0, amount: 6000, type: 'INSTALLMENT' as PaymentPlanType, installments: 4 },
            { user_index: 1, amount: 8000, type: 'INSTALLMENT' as PaymentPlanType, installments: 4 },
            { user_index: 2, amount: 5000, type: 'INSTALLMENT' as PaymentPlanType, installments: 5 },
            { user_index: 0, amount: 7500, type: 'INSTALLMENT' as PaymentPlanType, installments: 5 },
            { user_index: 1, amount: 9000, type: 'INSTALLMENT' as PaymentPlanType, installments: 6 },
            { user_index: 2, amount: 12000, type: 'INSTALLMENT' as PaymentPlanType, installments: 6 },
            { user_index: 0, amount: 10000, type: 'INSTALLMENT' as PaymentPlanType, installments: 10 },
            { user_index: 1, amount: 15000, type: 'INSTALLMENT' as PaymentPlanType, installments: 12 },

            // More variety
            { user_index: 2, amount: 2400, type: 'INSTALLMENT' as PaymentPlanType, installments: 3 },
            { user_index: 0, amount: 3600, type: 'INSTALLMENT' as PaymentPlanType, installments: 4 },
            { user_index: 1, amount: 4800, type: 'INSTALLMENT' as PaymentPlanType, installments: 4 },
            { user_index: 2, amount: 6000, type: 'INSTALLMENT' as PaymentPlanType, installments: 5 },
            { user_index: 0, amount: 7200, type: 'INSTALLMENT' as PaymentPlanType, installments: 6 },
            { user_index: 1, amount: 8400, type: 'INSTALLMENT' as PaymentPlanType, installments: 6 },
            { user_index: 2, amount: 9600, type: 'INSTALLMENT' as PaymentPlanType, installments: 8 },
            { user_index: 0, amount: 11000, type: 'INSTALLMENT' as PaymentPlanType, installments: 8 },
            { user_index: 1, amount: 13500, type: 'INSTALLMENT' as PaymentPlanType, installments: 10 },
            { user_index: 2, amount: 18000, type: 'INSTALLMENT' as PaymentPlanType, installments: 12 },
        ];

        let createdPlans = 0;
        let createdInvoices = 0;

        console.log(`📝 Creating ${testPlans.length} payment plans...\n`);

        for (const config of testPlans) {
            try {
                // Use available users or fallback to first user
                const userIndex = config.user_index % users.length;
                const user = users[userIndex];

                // Use current date as start date
                const startDate = new Date();

                // Create payment plan with schedules and invoices
                const result = await paymentPlanService.createPaymentPlanWithSchedule({
                    user_id: user.id,
                    total_amount: config.amount,
                    type: config.type,
                    number_of_installments: config.installments,
                    start_date: startDate,
                });

                createdPlans++;
                createdInvoices += result.invoices?.length || 0;

                console.log(`✅ Plan ${createdPlans}/${testPlans.length}: ${user.first_name} - $${config.amount} (${config.type}, ${config.installments} installment${config.installments > 1 ? 's' : ''}) - ${result.invoices?.length || 0} invoices`);

            } catch (error) {
                console.error(`❌ Failed to create plan ${createdPlans + 1}:`, error);
            }
        }

        // Show final statistics
        console.log('\n📊 Seeding Summary:');
        console.log('='.repeat(50));
        console.log(`✅ Payment Plans Created: ${createdPlans}`);
        console.log(`✅ Invoices Generated: ${createdInvoices}`);

        // Show database counts
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM payment_plans) as payment_plans,
                (SELECT COUNT(*) FROM payment_schedules) as payment_schedules,
                (SELECT COUNT(*) FROM invoices) as invoices,
                (SELECT COUNT(*) FROM invoices WHERE status = 'PAID') as paid_invoices,
                (SELECT COUNT(*) FROM invoices WHERE status != 'PAID') as pending_invoices
        `);

        console.log('\n📈 Database Totals:');
        console.table(counts.rows[0]);

        console.log('\n✨ Payment data seeding complete!\n');
        console.log('💡 Tips:');
        console.log('   - Login as admin to see all payment plans');
        console.log('   - View invoices in the Invoices page');
        console.log('   - Click "View Details" on any plan to see schedules\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding payment data:', error);
        process.exit(1);
    }
};

seedPaymentData();
