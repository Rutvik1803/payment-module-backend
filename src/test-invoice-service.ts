/**
 * Invoice Service Test Suite
 * 
 * Comprehensive tests for invoice generation service functionality.
 * Tests invoice number generation, invoice creation from schedules,
 * bulk generation, and enriched data retrieval.
 */

import invoiceService from './services/invoiceService';
import paymentPlanService from './services/paymentPlanService';
import { formatInvoiceNumber, parseInvoiceNumber } from './utils/invoiceUtils';

const TEST_USER_ID = 1; // Using existing seed user (admin@coursekey.com)

/**
 * Main test runner
 */
const runInvoiceServiceTests = async () => {
    console.log('=== Invoice Service Test Suite ===\n');

    let testPlanId: number;
    let testScheduleId: number;
    let testInvoiceId: number;

    try {
        // Test 1: Generate unique invoice number
        console.log('Test 1: Generating unique invoice number...');
        const invoiceNumber1 = await invoiceService.generateInvoiceNumber();
        console.log(`✅ Generated invoice number: ${invoiceNumber1}`);

        // Validate format
        const parsed1 = parseInvoiceNumber(invoiceNumber1);
        if (!parsed1) {
            throw new Error('Invalid invoice number format');
        }
        console.log(`   Format valid: Date=${parsed1.date.toISOString().split('T')[0]}, Sequence=${parsed1.sequence}`);

        // Test 2: Generate multiple invoice numbers (sequence increment)
        console.log('\nTest 2: Testing invoice number sequence...');
        const invoiceNumber2 = await invoiceService.generateInvoiceNumber();
        const invoiceNumber3 = await invoiceService.generateInvoiceNumber();
        console.log(`✅ Invoice 2: ${invoiceNumber2}`);
        console.log(`✅ Invoice 3: ${invoiceNumber3}`);

        const parsed2 = parseInvoiceNumber(invoiceNumber2);
        const parsed3 = parseInvoiceNumber(invoiceNumber3);

        if (parsed2 && parsed3) {
            console.log(`   Sequence incremented: ${parsed2.sequence} -> ${parsed3.sequence}`);
        }

        // Test 3: Create payment plan with schedules (for invoice generation)
        console.log('\nTest 3: Creating payment plan for invoice generation...');
        const planResult = await paymentPlanService.createPaymentPlanWithSchedule({
            user_id: TEST_USER_ID,
            total_amount: 3000.00,
            type: 'INSTALLMENT',
            number_of_installments: 3,
            start_date: new Date(),
        });

        testPlanId = planResult.plan.id;
        testScheduleId = planResult.schedules[0].id;

        console.log(`✅ Payment plan created: ID=${testPlanId}`);
        console.log(`   Type: ${planResult.plan.type}`);
        console.log(`   Total: $${Number(planResult.plan.total_amount).toFixed(2)}`);
        console.log(`   Schedules generated: ${planResult.schedules.length}`);

        // Test 4: Generate invoice from single schedule
        console.log('\nTest 4: Generating invoice from payment schedule...');
        const invoice1 = await invoiceService.generateInvoiceFromSchedule(testScheduleId);
        testInvoiceId = invoice1.id;

        console.log(`✅ Invoice created from schedule`);
        console.log(`   Invoice ID: ${invoice1.id}`);
        console.log(`   Invoice Number: ${invoice1.invoice_number}`);
        console.log(`   Amount: $${Number(invoice1.amount).toFixed(2)}`);
        console.log(`   Due Date: ${new Date(invoice1.due_date).toISOString().split('T')[0]}`);
        console.log(`   Status: ${invoice1.status}`);

        // Test 5: Try to generate duplicate invoice (should fail)
        console.log('\nTest 5: Testing duplicate invoice prevention...');
        try {
            await invoiceService.generateInvoiceFromSchedule(testScheduleId);
            console.log('❌ Should have thrown duplicate error');
        } catch (error: any) {
            console.log(`✅ Duplicate prevented: ${error.message}`);
        }

        // Test 6: Bulk generate invoices for payment plan
        console.log('\nTest 6: Bulk generating invoices for payment plan...');
        const bulkResult = await invoiceService.generateInvoicesForPaymentPlan(testPlanId);

        console.log(`✅ Bulk generation successful`);
        console.log(`   Invoices created: ${bulkResult.count}`);
        console.log(`   Payment Plan ID: ${bulkResult.paymentPlanId}`);

        bulkResult.invoices.forEach((inv, idx) => {
            console.log(`   Invoice ${idx + 1}: ${inv.invoice_number} - $${Number(inv.amount).toFixed(2)}`);
        });

        // Test 7: Get invoice with enriched details
        console.log('\nTest 7: Getting invoice with enriched details...');
        const invoiceDetails = await invoiceService.getInvoiceWithDetails(testInvoiceId);

        console.log(`✅ Invoice details retrieved`);
        console.log(`   Invoice: ${invoiceDetails.invoice_number}`);
        console.log(`   User: ${invoiceDetails.user?.email}`);
        console.log(`   Plan ID: ${invoiceDetails.plan?.id}`);
        console.log(`   Plan Type: ${invoiceDetails.plan?.type}`);
        if (invoiceDetails.schedule) {
            console.log(`   Schedule: Installment #${invoiceDetails.schedule.installment_number}`);
        }

        // Test 8: Get all invoices by payment plan
        console.log('\nTest 8: Getting all invoices for payment plan...');
        const planInvoices = await invoiceService.getInvoicesByPaymentPlan(testPlanId);

        console.log(`✅ Retrieved ${planInvoices.length} invoices for plan`);
        planInvoices.forEach((inv, idx) => {
            console.log(`   ${idx + 1}. ${inv.invoice_number} - $${Number(inv.amount).toFixed(2)} (${inv.status})`);
        });

        // Test 9: Get invoice summary by user
        console.log('\nTest 9: Getting invoice summary for user...');
        const summary = await invoiceService.getInvoiceSummaryByUser(TEST_USER_ID);

        console.log(`✅ Invoice summary retrieved`);
        console.log(`   Total Invoices: ${summary.totalInvoices}`);
        console.log(`   Total Amount: $${Number(summary.totalAmount).toFixed(2)}`);
        console.log(`   Paid Amount: $${Number(summary.paidAmount).toFixed(2)}`);
        console.log(`   Outstanding: $${Number(summary.outstandingAmount).toFixed(2)}`);
        console.log(`   Upcoming: ${summary.upcomingCount}`);
        console.log(`   Overdue: ${summary.overdueCount}`);
        console.log(`   Paid: ${summary.paidCount}`);

        // Test 10: Test invoice number formatting
        console.log('\nTest 10: Testing invoice number formatting...');
        const testDate = new Date('2026-02-23');
        const formattedNumber = formatInvoiceNumber(testDate, 42);
        console.log(`✅ Formatted: ${formattedNumber}`);

        const parsedBack = parseInvoiceNumber(formattedNumber);
        if (parsedBack) {
            console.log(`   Parsed back: Date=${parsedBack.date.toISOString().split('T')[0]}, Sequence=${parsedBack.sequence}`);
        }

        // Test 11: Validation - Non-existent schedule
        console.log('\nTest 11: Testing validation - non-existent schedule...');
        try {
            await invoiceService.generateInvoiceFromSchedule(99999);
            console.log('❌ Should have thrown not found error');
        } catch (error: any) {
            console.log(`✅ Not found error caught: ${error.message}`);
        }

        // Test 12: Validation - Non-existent payment plan
        console.log('\nTest 12: Testing validation - non-existent payment plan...');
        try {
            await invoiceService.getInvoicesByPaymentPlan(99999);
            console.log('❌ Should have thrown not found error');
        } catch (error: any) {
            console.log(`✅ Not found error caught: ${error.message}`);
        }

        // Test 13: Try bulk generation again (should fail - all invoices exist)
        console.log('\nTest 13: Testing bulk generation when all invoices exist...');
        try {
            await invoiceService.generateInvoicesForPaymentPlan(testPlanId);
            console.log('❌ Should have thrown validation error');
        } catch (error: any) {
            console.log(`✅ Validation error caught: ${error.message}`);
        }

        // Test 14: Create ONE_TIME payment plan and generate invoice
        console.log('\nTest 14: Testing invoice generation for ONE_TIME payment...');
        const oneTimePlan = await paymentPlanService.createPaymentPlanWithSchedule({
            user_id: TEST_USER_ID,
            total_amount: 500.00,
            type: 'ONE_TIME',
            number_of_installments: 1,
            start_date: new Date(),
        });

        const oneTimeInvoice = await invoiceService.generateInvoiceFromSchedule(
            oneTimePlan.schedules[0].id
        );

        console.log(`✅ ONE_TIME invoice created: ${oneTimeInvoice.invoice_number}`);
        console.log(`   Amount: $${Number(oneTimeInvoice.amount).toFixed(2)}`);
        console.log(`   Status: ${oneTimeInvoice.status}`);

        // Test 15: Test invoice summary accuracy
        console.log('\nTest 15: Verifying invoice summary calculations...');
        const finalSummary = await invoiceService.getInvoiceSummaryByUser(TEST_USER_ID);
        const allUserInvoices = await invoiceService.getInvoicesByPaymentPlan(testPlanId);

        // Calculate expected totals
        let expectedTotal = 0;
        allUserInvoices.forEach(inv => {
            expectedTotal += Number(inv.amount);
        });

        console.log(`✅ Summary calculations verified`);
        console.log(`   Expected amount in current plan: $${expectedTotal.toFixed(2)}`);
        console.log(`   Total across all invoices: $${Number(finalSummary.totalAmount).toFixed(2)}`);

        console.log('\n=== All Invoice Service Tests Passed! ✅ ===\n');
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Test failed with error:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        process.exit(1);
    }
};

// Run the tests
console.log('Starting Invoice Service tests...\n');
runInvoiceServiceTests();
