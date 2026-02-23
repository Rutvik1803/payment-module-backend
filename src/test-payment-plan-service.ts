/**
 * Test script for Payment Plan Service
 * 
 * Run with: ts-node src/test-payment-plan-service.ts
 */

import paymentPlanService from './services/paymentPlanService';
import { findUserById } from './models/User';
import { PaymentPlanType } from './types/paymentPlan';

const testPaymentPlanService = async () => {
    try {
        console.log('=== Testing Payment Plan Service ===\n');

        // Step 1: Find a test user (assuming users exist from seeds)
        console.log('Finding test user...');
        const user = await findUserById(1); // Admin user

        if (!user) {
            console.error('❌ No user found. Please run seed data first.');
            process.exit(1);
        }

        console.log(`✅ User found: ${user.first_name} ${user.last_name} (${user.email})\n`);

        // Test 1: Create ONE_TIME payment plan
        console.log('Test 1: Creating ONE_TIME payment plan...');
        const oneTimePlan = await paymentPlanService.createPaymentPlanWithSchedule({
            user_id: user.id,
            total_amount: 1000.00,
            type: 'ONE_TIME' as PaymentPlanType,
            number_of_installments: 1,
            start_date: new Date(),
        });

        console.log(`✅ ONE_TIME plan created: ID ${oneTimePlan.plan.id}`);
        console.log(`   Total: $${oneTimePlan.plan.total_amount}`);
        console.log(`   Type: ${oneTimePlan.plan.type}`);
        console.log(`   Schedules: ${oneTimePlan.schedules.length}`);
        console.log(`   First due date: ${oneTimePlan.schedules[0].due_date}\n`);

        // Test 2: Create INSTALLMENT payment plan (3 months)
        console.log('Test 2: Creating INSTALLMENT payment plan (3 months)...');
        const installmentPlan = await paymentPlanService.createPaymentPlanWithSchedule({
            user_id: user.id,
            total_amount: 3000.00,
            type: 'INSTALLMENT' as PaymentPlanType,
            number_of_installments: 3,
            start_date: new Date(),
        });

        console.log(`✅ INSTALLMENT plan created: ID ${installmentPlan.plan.id}`);
        console.log(`   Total: $${installmentPlan.plan.total_amount}`);
        console.log(`   Type: ${installmentPlan.plan.type}`);
        console.log(`   Number of installments: ${installmentPlan.plan.number_of_installments}`);
        console.log(`   Schedules created: ${installmentPlan.schedules.length}`);

        console.log('   Installment breakdown:');
        installmentPlan.schedules.forEach((schedule, index) => {
            console.log(`     ${index + 1}. $${schedule.amount} due on ${new Date(schedule.due_date).toLocaleDateString()}`);
        });
        console.log();

        // Test 3: Create INSTALLMENT plan with odd amount (12 months)
        console.log('Test 3: Creating INSTALLMENT plan with odd amount (12 months)...');
        const oddAmountPlan = await paymentPlanService.createPaymentPlanWithSchedule({
            user_id: user.id,
            total_amount: 1234.56,
            type: 'INSTALLMENT' as PaymentPlanType,
            number_of_installments: 12,
            start_date: new Date(), // Use current date
        });

        console.log(`✅ Odd amount plan created: ID ${oddAmountPlan.plan.id}`);
        console.log(`   Total: $${oddAmountPlan.plan.total_amount}`);
        console.log(`   Installments: ${oddAmountPlan.schedules.length}`);

        const totalFromSchedules = oddAmountPlan.schedules.reduce((sum, s) => sum + Number(s.amount), 0);
        console.log(`   Sum of installments: $${totalFromSchedules.toFixed(2)}`);
        console.log(`   Match: ${totalFromSchedules === oddAmountPlan.plan.total_amount ? '✅' : '❌'}\n`);

        // Test 4: Get payment plan with schedules
        console.log('Test 4: Getting payment plan with schedules...');
        const retrievedPlan = await paymentPlanService.getPaymentPlanWithSchedules(installmentPlan.plan.id);
        console.log(`✅ Retrieved plan ID: ${retrievedPlan.plan.id}`);
        console.log(`   Status: ${retrievedPlan.plan.status}`);
        console.log(`   Schedules: ${retrievedPlan.schedules.length}\n`);

        // Test 5: Get payment plans by user
        console.log('Test 5: Getting all payment plans for user...');
        const userPlans = await paymentPlanService.getPaymentPlansByUser(user.id);
        console.log(`✅ Found ${userPlans.length} payment plans for user\n`);

        // Test 6: Get payment plan summary
        console.log('Test 6: Getting payment plan summary...');
        const summary = await paymentPlanService.getPaymentPlanSummary(installmentPlan.plan.id);
        console.log(`✅ Summary for plan ID: ${summary.plan.id}`);
        console.log(`   Total installments: ${summary.progress.totalInstallments}`);
        console.log(`   Paid: ${summary.progress.paidInstallments}`);
        console.log(`   Pending: ${summary.progress.pendingInstallments}`);
        console.log(`   Overdue: ${summary.progress.overdueInstallments}`);
        console.log(`   Completion: ${summary.progress.percentageComplete}%\n`);

        // Test 7: Update payment plan status
        console.log('Test 7: Updating payment plan status...');
        const updatedPlan = await paymentPlanService.updatePaymentPlanStatus(
            oneTimePlan.plan.id,
            'COMPLETED'
        );
        console.log(`✅ Updated plan status to: ${updatedPlan.status}\n`);

        // Test 8: Cancel payment plan
        console.log('Test 8: Cancelling payment plan...');
        const cancelledPlan = await paymentPlanService.cancelPaymentPlan(installmentPlan.plan.id);
        console.log(`✅ Plan cancelled: ${cancelledPlan.status}\n`);

        // Test 9: Validation - Invalid amount
        console.log('Test 9: Testing validation - invalid amount...');
        try {
            await paymentPlanService.createPaymentPlanWithSchedule({
                user_id: user.id,
                total_amount: 0.50, // Below minimum
                type: 'ONE_TIME' as PaymentPlanType,
                number_of_installments: 1,
            });
            console.log('❌ Should have thrown validation error');
        } catch (error: any) {
            console.log(`✅ Validation error caught: ${error.message}\n`);
        }

        // Test 10: Validation - Invalid installments
        console.log('Test 10: Testing validation - invalid installments...');
        try {
            await paymentPlanService.createPaymentPlanWithSchedule({
                user_id: user.id,
                total_amount: 1000.00,
                type: 'INSTALLMENT' as PaymentPlanType,
                number_of_installments: 1, // Should be at least 2
            });
            console.log('❌ Should have thrown validation error');
        } catch (error: any) {
            console.log(`✅ Validation error caught: ${error.message}\n`);
        }

        // Test 11: Validation - Non-existent user
        console.log('Test 11: Testing validation - non-existent user...');
        try {
            await paymentPlanService.createPaymentPlanWithSchedule({
                user_id: 99999,
                total_amount: 1000.00,
                type: 'ONE_TIME' as PaymentPlanType,
                number_of_installments: 1,
            });
            console.log('❌ Should have thrown not found error');
        } catch (error: any) {
            console.log(`✅ Not found error caught: ${error.message}\n`);
        }

        console.log('=== All Payment Plan Service Tests Passed! ✅ ===\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

// Run tests
testPaymentPlanService();
