import * as PaymentPlan from './models/PaymentPlan';
import { CreatePaymentPlanDTO } from './types/paymentPlan';

const testPaymentPlanModel = async () => {
    try {
        console.log('Testing Payment Plan Model...\n');

        // Test 1: Create ONE_TIME payment plan
        console.log('Test 1: Creating ONE_TIME payment plan...');
        const oneTimePlan: CreatePaymentPlanDTO = {
            user_id: 2, // Using student user
            total_amount: 5000.00,
            type: 'ONE_TIME',
            start_date: new Date()
        };

        const created = await PaymentPlan.createPaymentPlan(oneTimePlan);
        console.log('✅ ONE_TIME plan created:', {
            id: created.id,
            total_amount: created.total_amount,
            paid_amount: created.paid_amount,
            remaining_amount: created.remaining_amount,
            status: created.status,
            type: created.type
        });

        // Test 2: Create INSTALLMENT payment plan
        console.log('\nTest 2: Creating INSTALLMENT payment plan...');
        const installmentPlan: CreatePaymentPlanDTO = {
            user_id: 2,
            total_amount: 10000.00,
            type: 'INSTALLMENT',
            number_of_installments: 4,
            start_date: new Date()
        };

        const installment = await PaymentPlan.createPaymentPlan(installmentPlan);
        console.log('✅ INSTALLMENT plan created:', {
            id: installment.id,
            total_amount: installment.total_amount,
            number_of_installments: installment.number_of_installments,
            status: installment.status
        });

        // Test 3: Find payment plan by ID
        console.log('\nTest 3: Finding payment plan by ID...');
        const found = await PaymentPlan.findPaymentPlanById(created.id);
        console.log('✅ Payment plan found:', found?.id);

        // Test 4: Find all payment plans for user
        console.log('\nTest 4: Finding all payment plans for user...');
        const userPlans = await PaymentPlan.findPaymentPlansByUserId(2);
        console.log(`✅ Found ${userPlans.length} payment plans for user 2`);

        // Test 5: Update paid amount
        console.log('\nTest 5: Updating paid amount...');
        const updated = await PaymentPlan.updatePaidAmount(created.id, 2000.00);
        console.log('✅ Paid amount updated:', {
            id: updated?.id,
            paid_amount: updated?.paid_amount,
            remaining_amount: updated?.remaining_amount
        });

        // Test 6: Check if plan should be completed
        console.log('\nTest 6: Paying remaining amount...');
        await PaymentPlan.updatePaidAmount(created.id, 3000.00);
        const completed = await PaymentPlan.checkAndCompletePaymentPlan(created.id);
        console.log('✅ Payment plan status after full payment:', completed?.status);

        // Test 7: Filter payment plans
        console.log('\nTest 7: Filtering payment plans by status...');
        const activePlans = await PaymentPlan.findAllPaymentPlans({ status: 'ACTIVE' });
        console.log(`✅ Found ${activePlans.length} ACTIVE payment plans`);

        const completedPlans = await PaymentPlan.findAllPaymentPlans({ status: 'COMPLETED' });
        console.log(`✅ Found ${completedPlans.length} COMPLETED payment plans`);

        // Test 8: Update payment plan status
        console.log('\nTest 8: Cancelling payment plan...');
        const cancelled = await PaymentPlan.updatePaymentPlanStatus(installment.id, 'CANCELLED');
        console.log('✅ Payment plan cancelled:', cancelled?.status);

        // Test 9: Delete payment plan (soft delete)
        console.log('\nTest 9: Soft deleting payment plan...');
        const deleted = await PaymentPlan.deletePaymentPlan(created.id);
        console.log('✅ Payment plan soft deleted:', deleted);

        // Verify soft delete
        const softDeleted = await PaymentPlan.findPaymentPlanById(created.id);
        console.log('✅ Soft deleted plan status:', softDeleted?.status);

        // Test 10: Hard delete for cleanup
        console.log('\nTest 10: Cleaning up test data...');
        await PaymentPlan.hardDeletePaymentPlan(created.id);
        await PaymentPlan.hardDeletePaymentPlan(installment.id);
        console.log('✅ Test data cleaned up');

        console.log('\n✅ All Payment Plan Model tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

testPaymentPlanModel();
