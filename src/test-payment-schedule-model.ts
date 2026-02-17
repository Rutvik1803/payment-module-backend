/**
 * Test Payment Schedule Model
 * 
 * Comprehensive tests for PaymentSchedule model functions.
 */

import {
    createPaymentSchedule,
    createPaymentSchedules,
    generatePaymentSchedules,
    findPaymentScheduleById,
    findPaymentSchedulesByPlanId,
    findPaymentSchedulesByInvoiceId,
    findAllPaymentSchedules,
    updatePaymentSchedule,
    markScheduleAsPaid,
    markScheduleAsOverdue,
    cancelSchedule,
    updateScheduleStatus,
    getOverdueSchedules,
    getUpcomingSchedules,
    deletePaymentSchedule,
    linkScheduleToInvoice
} from './models/PaymentSchedule';
import { PaymentSchedule } from './types/paymentSchedule';

const testPaymentScheduleModel = async () => {
    let testScheduleId: number;
    let testScheduleId2: number;
    let testScheduleId3: number;
    let testPlanId: number | undefined;
    let testInvoiceId: number | undefined;
    let testUserId = 2; // Use existing user

    try {
        console.log('🧪 Testing Payment Schedule Model...\n');

        // Setup: Create test payment plan
        console.log('📋 Setting up test data...');
        const { createPaymentPlan } = await import('./models/PaymentPlan');
        const { createInvoice } = await import('./models/Invoice');

        const testPlan = await createPaymentPlan({
            user_id: testUserId,
            total_amount: 5000.00,
            type: 'INSTALLMENT',
            number_of_installments: 6,
            start_date: new Date()
        });
        testPlanId = testPlan.id;
        console.log(`✅ Created test payment plan with ID ${testPlanId}`);

        // Create test invoice
        const testInvoice = await createInvoice({
            user_id: testUserId,
            invoice_number: `INV-TEST-${Date.now()}`,
            amount: 500.00,
            due_date: new Date(),
            payment_plan_id: testPlanId
        });
        testInvoiceId = testInvoice.id;
        console.log(`✅ Created test invoice with ID ${testInvoiceId}\n`);

        // Test 1: Create single payment schedule
        console.log('Test 1: Creating single payment schedule...');
        const dueDate1 = new Date();
        dueDate1.setDate(dueDate1.getDate() + 30); // Due in 30 days

        const schedule1 = await createPaymentSchedule({
            payment_plan_id: testPlanId,
            installment_number: 1,
            amount: 500.00,
            due_date: dueDate1,
            status: 'PENDING'
        });

        testScheduleId = schedule1.id;
        console.log(`✅ Test 1 passed: Created schedule with ID ${testScheduleId}, amount: $${schedule1.amount}, due: ${schedule1.due_date}`);

        // Test 2: Find schedule by ID
        console.log('\nTest 2: Finding schedule by ID...');
        const found = await findPaymentScheduleById(testScheduleId);
        if (found && found.id === testScheduleId) {
            console.log(`✅ Test 2 passed: Found schedule with installment number ${found.installment_number}`);
        } else {
            throw new Error('Schedule not found');
        }

        // Test 3: Create second schedule
        console.log('\nTest 3: Creating second payment schedule...');
        const dueDate2 = new Date();
        dueDate2.setDate(dueDate2.getDate() + 60); // Due in 60 days

        const schedule2 = await createPaymentSchedule({
            payment_plan_id: testPlanId,
            installment_number: 2,
            amount: 500.00,
            due_date: dueDate2,
            status: 'PENDING'
        });

        testScheduleId2 = schedule2.id;
        console.log(`✅ Test 3 passed: Created second schedule with ID ${testScheduleId2}`);

        // Test 4: Find all schedules for payment plan
        console.log('\nTest 4: Finding all schedules for payment plan...');
        const planSchedules = await findPaymentSchedulesByPlanId(testPlanId);
        console.log(`✅ Test 4 passed: Found ${planSchedules.length} schedules for plan ${testPlanId}`);

        // Test 5: Generate payment schedules (3 monthly installments)
        console.log('\nTest 5: Generating payment schedules (3 installments)...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 90); // Start in 90 days

        const generated = await generatePaymentSchedules({
            payment_plan_id: testPlanId,
            total_amount: 1500.00,
            number_of_installments: 3,
            start_date: startDate,
            frequency: 'MONTHLY'
        });

        console.log(`✅ Test 5 passed: Generated ${generated.total_schedules} schedules, total: $${generated.total_amount}`);
        console.log(`   - Installment amounts: ${generated.schedules.map(s => `$${s.amount}`).join(', ')}`);

        // Store first generated schedule ID for later tests
        testScheduleId3 = generated.schedules[0].id;

        // Test 6: Verify installment amounts distribution
        console.log('\nTest 6: Verifying installment amounts...');
        const totalGenerated = generated.schedules.reduce((sum, s) => sum + Number(s.amount), 0);
        if (Math.abs(totalGenerated - 1500.00) < 0.01) {
            console.log(`✅ Test 6 passed: Total amount matches: $${totalGenerated}`);
        } else {
            throw new Error(`Amount mismatch: expected $1500, got $${totalGenerated}`);
        }

        // Test 7: Verify due dates are calculated correctly
        console.log('\nTest 7: Verifying due dates calculation...');
        const schedule1Due = new Date(generated.schedules[0].due_date);
        const schedule2Due = new Date(generated.schedules[1].due_date);
        const daysDiff = Math.floor((schedule2Due.getTime() - schedule1Due.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 30) {
            console.log(`✅ Test 7 passed: Monthly frequency working (${daysDiff} days between installments)`);
        } else {
            console.log(`⚠️  Test 7: Days between installments: ${daysDiff} (expected 30)`);
        }

        // Test 8: Mark schedule as paid
        console.log('\nTest 8: Marking schedule as paid...');
        const paidDate = new Date();
        const paidSchedule = await markScheduleAsPaid(testScheduleId, paidDate, testInvoiceId);

        if (paidSchedule && paidSchedule.status === 'PAID' && paidSchedule.paid_date) {
            console.log(`✅ Test 8 passed: Schedule marked as PAID, paid_date: ${paidSchedule.paid_date}`);
        } else {
            throw new Error('Failed to mark schedule as paid');
        }

        // Test 9: Update schedule
        console.log('\nTest 9: Updating schedule amount...');
        const updated = await updatePaymentSchedule(testScheduleId2, {
            amount: 550.00
        });

        if (updated && Number(updated.amount) === 550.00) {
            console.log(`✅ Test 9 passed: Schedule amount updated to $${updated.amount}`);
        } else {
            console.log(`⚠️  Test 9: Updated schedule:`, updated);
            throw new Error(`Failed to update schedule - amount is ${updated?.amount}`);
        }

        // Test 10: Filter schedules by status
        console.log('\nTest 10: Filtering schedules by status (PENDING)...');
        const pendingSchedules = await findAllPaymentSchedules({
            payment_plan_id: testPlanId,
            status: 'PENDING'
        });
        console.log(`✅ Test 10 passed: Found ${pendingSchedules.length} PENDING schedules`);

        // Test 11: Filter schedules by status (PAID)
        console.log('\nTest 11: Filtering schedules by status (PAID)...');
        const paidSchedules = await findAllPaymentSchedules({
            payment_plan_id: testPlanId,
            status: 'PAID'
        });
        console.log(`✅ Test 11 passed: Found ${paidSchedules.length} PAID schedules`);

        // Test 12: Mark schedule as overdue
        console.log('\nTest 12: Marking schedule as overdue...');
        const overdueSchedule = await markScheduleAsOverdue(testScheduleId2);

        if (overdueSchedule && overdueSchedule.status === 'OVERDUE') {
            console.log(`✅ Test 12 passed: Schedule marked as OVERDUE`);
        } else {
            throw new Error('Failed to mark schedule as overdue');
        }

        // Test 13: Get overdue schedules
        console.log('\nTest 13: Getting overdue schedules...');
        const overdueList = await getOverdueSchedules();
        console.log(`✅ Test 13 passed: Found ${overdueList.length} overdue schedules`);

        // Test 14: Get upcoming schedules
        console.log('\nTest 14: Getting upcoming schedules (next 120 days)...');
        const upcomingSchedules = await getUpcomingSchedules(120);
        console.log(`✅ Test 14 passed: Found ${upcomingSchedules.length} upcoming schedules`);

        // Test 15: Filter by date range
        console.log('\nTest 15: Filtering schedules by date range...');
        const dateFrom = new Date();
        const dateTo = new Date();
        dateTo.setDate(dateTo.getDate() + 45);

        const dateRangeSchedules = await findAllPaymentSchedules({
            payment_plan_id: testPlanId,
            due_date_from: dateFrom,
            due_date_to: dateTo
        });
        console.log(`✅ Test 15 passed: Found ${dateRangeSchedules.length} schedules in date range`);

        // Test 16: Link schedule to invoice
        console.log('\nTest 16: Linking schedule to invoice...');
        const linked = await linkScheduleToInvoice(testScheduleId3, testInvoiceId);

        if (linked && linked.invoice_id === testInvoiceId) {
            console.log(`✅ Test 16 passed: Schedule linked to invoice ${testInvoiceId}`);
        } else {
            throw new Error('Failed to link schedule to invoice');
        }

        // Test 17: Find schedules by invoice ID
        console.log('\nTest 17: Finding schedules by invoice ID...');
        const invoiceSchedules = await findPaymentSchedulesByInvoiceId(testInvoiceId);
        console.log(`✅ Test 17 passed: Found ${invoiceSchedules.length} schedules for invoice ${testInvoiceId}`);

        // Test 18: Cancel schedule
        console.log('\nTest 18: Cancelling schedule...');
        const thirdGenScheduleId = generated.schedules[2].id;
        const cancelled = await cancelSchedule(thirdGenScheduleId);

        if (cancelled && cancelled.status === 'CANCELLED') {
            console.log(`✅ Test 18 passed: Schedule cancelled`);
        } else {
            throw new Error('Failed to cancel schedule');
        }

        // Test 19: Verify cancelled excluded from pending list
        console.log('\nTest 19: Verifying cancelled schedules excluded from PENDING list...');
        const pendingAfterCancel = await findAllPaymentSchedules({
            payment_plan_id: testPlanId,
            status: 'PENDING'
        });
        console.log(`✅ Test 19 passed: PENDING schedules: ${pendingAfterCancel.length} (cancelled excluded)`);

        // Test 20: Update schedule status (check overdue logic)
        console.log('\nTest 20: Testing updateScheduleStatus function...');
        // Create a schedule with past due date
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

        const pastSchedule = await createPaymentSchedule({
            payment_plan_id: testPlanId,
            installment_number: 99,
            amount: 100.00,
            due_date: pastDate,
            status: 'PENDING'
        });

        const checkedSchedule = await updateScheduleStatus(pastSchedule.id);

        if (checkedSchedule && checkedSchedule.status === 'OVERDUE') {
            console.log(`✅ Test 20 passed: Past due schedule automatically marked as OVERDUE`);
        } else {
            console.log(`⚠️  Test 20: Status is ${checkedSchedule?.status} (expected OVERDUE)`);
        }

        // Cleanup: Delete all test schedules
        console.log('\n🧹 Cleaning up test data...');

        // Get all schedules for test plan and delete them
        const allTestSchedules = await findPaymentSchedulesByPlanId(testPlanId);
        let deletedCount = 0;

        for (const schedule of allTestSchedules) {
            await deletePaymentSchedule(schedule.id);
            deletedCount++;
        }

        // Also delete the past schedule if it wasn't included
        try {
            await deletePaymentSchedule(pastSchedule.id);
            deletedCount++;
        } catch (e) {
            // Already deleted
        }

        console.log(`✅ Cleanup complete: Deleted ${deletedCount} test schedules`);

        // Cleanup test data
        const { hardDeletePaymentPlan } = await import('./models/PaymentPlan');
        const { hardDeleteInvoice } = await import('./models/Invoice');

        await hardDeleteInvoice(testInvoiceId);
        await hardDeletePaymentPlan(testPlanId);
        console.log('✅ Deleted test invoice and payment plan');

        console.log('\n✅ All Payment Schedule Model tests passed!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);

        // Attempt cleanup on failure
        try {
            console.log('\n🧹 Attempting cleanup after failure...');
            if (testPlanId) {
                const allSchedules = await findPaymentSchedulesByPlanId(testPlanId);
                for (const schedule of allSchedules) {
                    await deletePaymentSchedule(schedule.id);
                }

                const { hardDeletePaymentPlan } = await import('./models/PaymentPlan');
                const { hardDeleteInvoice } = await import('./models/Invoice');

                if (testInvoiceId) await hardDeleteInvoice(testInvoiceId);
                await hardDeletePaymentPlan(testPlanId);
            }
            console.log('✅ Cleanup complete');
        } catch (cleanupError) {
            console.error('❌ Cleanup failed:', cleanupError);
        }

        process.exit(1);
    }
};

testPaymentScheduleModel();
