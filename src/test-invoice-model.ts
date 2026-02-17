import * as Invoice from './models/Invoice';
import * as PaymentPlan from './models/PaymentPlan';
import { CreateInvoiceDTO } from './types/invoice';
import { CreatePaymentPlanDTO } from './types/paymentPlan';

const testInvoiceModel = async () => {
    let testPaymentPlanId: number | null = null;

    try {
        console.log('Testing Invoice Model...\n');

        // Setup: Create a test payment plan for foreign key constraint
        console.log('Setup: Creating test payment plan...');
        const planData: CreatePaymentPlanDTO = {
            user_id: 2,
            total_amount: 10000.00,
            type: 'INSTALLMENT',
            number_of_installments: 4
        };
        const testPlan = await PaymentPlan.createPaymentPlan(planData);
        testPaymentPlanId = testPlan.id;
        console.log('✅ Test payment plan created:', testPaymentPlanId);

        // Test 1: Create invoice without payment plan
        console.log('\nTest 1: Creating invoice without payment plan...');
        const invoiceData1: CreateInvoiceDTO = {
            user_id: 2, // Using student user
            invoice_number: 'INV-2024-001',
            amount: 1500.00,
            due_date: new Date('2024-03-15')
        };

        const created1 = await Invoice.createInvoice(invoiceData1);
        console.log('✅ Invoice created without payment plan:', {
            id: created1.id,
            invoice_number: created1.invoice_number,
            amount: created1.amount,
            paid_amount: created1.paid_amount,
            status: created1.status
        });

        // Test 2: Create invoice with payment plan
        console.log('\nTest 2: Creating invoice with payment plan...');
        const invoiceData2: CreateInvoiceDTO = {
            user_id: 2,
            invoice_number: 'INV-2024-002',
            amount: 2500.00,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            payment_plan_id: testPaymentPlanId
        };

        const created2 = await Invoice.createInvoice(invoiceData2);
        console.log('✅ Invoice created with payment plan:', {
            id: created2.id,
            invoice_number: created2.invoice_number,
            payment_plan_id: created2.payment_plan_id,
            status: created2.status // Should be UPCOMING
        });

        // Test 3: Find invoice by ID
        console.log('\nTest 3: Finding invoice by ID...');
        const found = await Invoice.findInvoiceById(created1.id);
        console.log('✅ Invoice found by ID:', found?.invoice_number);

        // Test 4: Find invoice by number
        console.log('\nTest 4: Finding invoice by number...');
        const foundByNumber = await Invoice.findInvoiceByNumber('INV-2024-001');
        console.log('✅ Invoice found by number:', foundByNumber?.id);

        // Test 5: Find invoices by user
        console.log('\nTest 5: Finding invoices by user...');
        const userInvoices = await Invoice.findInvoicesByUserId(2);
        console.log(`✅ Found ${userInvoices.length} invoices for user 2`);

        // Test 6: Update paid amount (partial payment)
        console.log('\nTest 6: Making partial payment...');
        const partialPaid = await Invoice.updatePaidAmount(created1.id, 500.00);
        console.log('✅ Partial payment made:', {
            id: partialPaid?.id,
            paid_amount: partialPaid?.paid_amount,
            status: partialPaid?.status // Should be PARTIAL
        });

        // Test 7: Complete payment
        console.log('\nTest 7: Completing payment...');
        const fullyPaid = await Invoice.updatePaidAmount(created1.id, 1000.00);
        console.log('✅ Payment completed:', {
            id: fullyPaid?.id,
            paid_amount: fullyPaid?.paid_amount,
            status: fullyPaid?.status // Should be PAID
        });

        // Test 8: Create overdue invoice and calculate status
        console.log('\nTest 8: Creating overdue invoice...');
        const overdueData: CreateInvoiceDTO = {
            user_id: 2,
            invoice_number: 'INV-2024-003',
            amount: 1000.00,
            due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        };

        const overdue = await Invoice.createInvoice(overdueData);
        console.log('✅ Overdue invoice created:', {
            id: overdue.id,
            status: overdue.status // Should be OUTSTANDING
        });

        // Test 9: Calculate invoice status
        console.log('\nTest 9: Recalculating invoice status...');
        const recalculated = await Invoice.calculateInvoiceStatus(overdue.id);
        console.log('✅ Status recalculated:', recalculated?.status);

        // Test 10: Filter invoices by status
        console.log('\nTest 10: Filtering invoices by status...');
        const paidInvoices = await Invoice.findAllInvoices({ status: 'PAID' });
        console.log(`✅ Found ${paidInvoices.length} PAID invoices`);

        const partialInvoices = await Invoice.findAllInvoices({ status: 'PARTIAL' });
        console.log(`✅ Found ${partialInvoices.length} PARTIAL invoices`);

        const upcomingInvoices = await Invoice.findAllInvoices({ status: 'UPCOMING' });
        console.log(`✅ Found ${upcomingInvoices.length} UPCOMING invoices`);

        // Test 11: Filter by payment plan
        console.log('\nTest 11: Filtering invoices by payment plan...');
        const planInvoices = await Invoice.findInvoicesByPaymentPlan(testPaymentPlanId!);
        console.log(`✅ Found ${planInvoices.length} invoices for payment plan ${testPaymentPlanId}`);

        // Test 12: Check invoice number exists
        console.log('\nTest 12: Checking invoice number existence...');
        const exists = await Invoice.invoiceNumberExists('INV-2024-001');
        console.log('✅ Invoice number exists:', exists);

        const notExists = await Invoice.invoiceNumberExists('INV-9999-999');
        console.log('✅ Non-existent invoice number:', notExists);

        // Test 13: Update invoice details
        console.log('\nTest 13: Updating invoice amount...');
        const updated = await Invoice.updateInvoice(created2.id, {
            amount: 3000.00
        });
        console.log('✅ Invoice updated:', {
            id: updated?.id,
            amount: updated?.amount
        });

        // Test 14: Recalculate all statuses
        console.log('\nTest 14: Recalculating all invoice statuses...');
        const updatedCount = await Invoice.recalculateAllInvoiceStatuses();
        console.log(`✅ Recalculated ${updatedCount} invoice statuses`);

        // Test 15: Cleanup test data
        console.log('\nTest 15: Cleaning up test data...');
        await Invoice.hardDeleteInvoice(created1.id);
        await Invoice.hardDeleteInvoice(created2.id);
        await Invoice.hardDeleteInvoice(overdue.id);

        // Cleanup test payment plan
        if (testPaymentPlanId) {
            await PaymentPlan.hardDeletePaymentPlan(testPaymentPlanId);
        }
        console.log('✅ Test data cleaned up');

        console.log('\n✅ All Invoice Model tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);

        // Cleanup on error
        if (testPaymentPlanId) {
            try {
                await PaymentPlan.hardDeletePaymentPlan(testPaymentPlanId);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }

        process.exit(1);
    }
};

testInvoiceModel();
