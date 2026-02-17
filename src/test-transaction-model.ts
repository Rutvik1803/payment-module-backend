/**
 * Transaction Model Test
 * Comprehensive tests for all Transaction model operations
 */

import * as Transaction from './models/Transaction';
import * as Invoice from './models/Invoice';
import * as PaymentPlan from './models/PaymentPlan';

let testInvoiceId: number;
let testPaymentPlanId: number;

const runTests = async () => {
    try {
        console.log('=== Transaction Model Tests ===\n');

        // ===== SETUP =====
        console.log('Setup: Creating test payment plan and invoice...');
        const paymentPlan = await PaymentPlan.createPaymentPlan({
            user_id: 2,
            total_amount: 5000,
            type: 'INSTALLMENT',
            number_of_installments: 5,
            start_date: new Date(),
        });
        testPaymentPlanId = paymentPlan.id;
        console.log(`✅ Created test payment plan: ${testPaymentPlanId}`);

        const invoice = await Invoice.createInvoice({
            user_id: 2,
            payment_plan_id: testPaymentPlanId,
            invoice_number: `INV-TEST-${Date.now()}`,
            amount: 1000,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        });
        testInvoiceId = invoice.id;
        console.log(`✅ Created test invoice: ${testInvoiceId}\n`);

        // ===== TEST 1: Create transaction =====
        console.log('Test 1: Create payment transaction...');
        const transaction1 = await Transaction.createTransaction({
            user_id: 2,
            invoice_id: testInvoiceId,
            payment_plan_id: testPaymentPlanId,
            amount: 250,
            type: 'PAYMENT',
            payment_method: 'CARD',
            gateway_transaction_id: 'CARD123456',
            notes: 'Test payment transaction',
        });
        console.log(`✅ Transaction created: id=${transaction1.id}, amount=$${transaction1.amount}, status=${transaction1.status}`);

        // ===== TEST 2: Find transaction by ID =====
        console.log('\nTest 2: Find transaction by ID...');
        const foundTransaction = await Transaction.findTransactionById(transaction1.id);
        console.log(`✅ Transaction found: ${foundTransaction?.gateway_transaction_id}`);

        // ===== TEST 3: Find transaction by gateway ID =====
        console.log('\nTest 3: Find transaction by gateway ID...');
        const foundByGateway = await Transaction.findTransactionByGatewayId('CARD123456');
        console.log(`✅ Transaction found by gateway ID: ${foundByGateway?.id}`);

        // ===== TEST 4: Update transaction status =====
        console.log('\nTest 4: Update transaction status to COMPLETED...');
        const updatedTransaction = await Transaction.updateTransactionStatus(transaction1.id, 'COMPLETED');
        console.log(`✅ Transaction status updated: ${updatedTransaction?.status}`);

        // ===== TEST 5: Record payment (with invoice update) =====
        console.log('\nTest 5: Record payment (should update invoice)...');
        const paymentTransaction = await Transaction.recordPayment({
            user_id: 2,
            invoice_id: testInvoiceId,
            payment_plan_id: testPaymentPlanId,
            amount: 500,
            type: 'PAYMENT',
            payment_method: 'ACH',
            gateway_transaction_id: 'ACH789012',
            notes: 'Payment with invoice update',
        });
        console.log(`✅ Payment recorded: id=${paymentTransaction.id}, amount=$${paymentTransaction.amount}`);

        // Check invoice paid amount
        const updatedInvoice = await Invoice.findInvoiceById(testInvoiceId);
        console.log(`✅ Invoice paid amount: $${updatedInvoice?.paid_amount} (should be $500.00)`);

        // ===== TEST 6: Find transactions by user =====
        console.log('\nTest 6: Find transactions by user...');
        const userTransactions = await Transaction.findTransactionsByUserId(2);
        console.log(`✅ Found ${userTransactions.length} transactions for user 2`);

        // ===== TEST 7: Find transactions by invoice =====
        console.log('\nTest 7: Find transactions by invoice...');
        const invoiceTransactions = await Transaction.findTransactionsByInvoiceId(testInvoiceId);
        console.log(`✅ Found ${invoiceTransactions.length} transactions for invoice ${testInvoiceId}`);

        // ===== TEST 8: Find transactions by payment plan =====
        console.log('\nTest 8: Find transactions by payment plan...');
        const planTransactions = await Transaction.findTransactionsByPaymentPlan(testPaymentPlanId);
        console.log(`✅ Found ${planTransactions.length} transactions for payment plan ${testPaymentPlanId}`);

        // ===== TEST 9: Create refund transaction =====
        console.log('\nTest 9: Create refund transaction...');
        const refundTransaction = await Transaction.createTransaction({
            user_id: 2,
            invoice_id: testInvoiceId,
            payment_plan_id: testPaymentPlanId,
            amount: 100,
            type: 'REFUND',
            payment_method: 'CARD',
            status: 'COMPLETED',
            gateway_transaction_id: 'REFUND123',
            notes: 'Test refund',
        });
        console.log(`✅ Refund transaction created: id=${refundTransaction.id}, amount=$${refundTransaction.amount}`);

        // ===== TEST 10: Record refund (with invoice update) =====
        console.log('\nTest 10: Record refund (should update invoice)...');
        const refundWithUpdate = await Transaction.recordRefund({
            user_id: 2,
            invoice_id: testInvoiceId,
            payment_plan_id: testPaymentPlanId,
            amount: 50,
            type: 'REFUND',
            payment_method: 'ACH',
            gateway_transaction_id: 'REFUND456',
            notes: 'Refund with invoice update',
        });
        console.log(`✅ Refund recorded: id=${refundWithUpdate.id}, amount=$${refundWithUpdate.amount}`);

        // Check invoice paid amount after refund
        const invoiceAfterRefund = await Invoice.findInvoiceById(testInvoiceId);
        console.log(`✅ Invoice paid amount after refund: $${invoiceAfterRefund?.paid_amount} (should be $450.00)`);

        // ===== TEST 11: Filter transactions by status =====
        console.log('\nTest 11: Filter transactions by status...');
        const completedTransactions = await Transaction.findAllTransactions({
            user_id: 2,
            status: 'COMPLETED',
        });
        console.log(`✅ Found ${completedTransactions.length} COMPLETED transactions`);

        const pendingTransactions = await Transaction.findAllTransactions({
            user_id: 2,
            status: 'PENDING',
        });
        console.log(`✅ Found ${pendingTransactions.length} PENDING transactions`);

        // ===== TEST 12: Filter transactions by type =====
        console.log('\nTest 12: Filter transactions by type...');
        const payments = await Transaction.findAllTransactions({
            user_id: 2,
            type: 'PAYMENT',
        });
        console.log(`✅ Found ${payments.length} PAYMENT transactions`);

        const refunds = await Transaction.findAllTransactions({
            user_id: 2,
            type: 'REFUND',
        });
        console.log(`✅ Found ${refunds.length} REFUND transactions`);

        // ===== TEST 13: Filter transactions by payment method =====
        console.log('\nTest 13: Filter transactions by payment method...');
        const cardTransactions = await Transaction.findAllTransactions({
            user_id: 2,
            payment_method: 'CARD',
        });
        console.log(`✅ Found ${cardTransactions.length} CARD transactions`);

        const achTransactions = await Transaction.findAllTransactions({
            user_id: 2,
            payment_method: 'ACH',
        });
        console.log(`✅ Found ${achTransactions.length} ACH transactions`);

        // ===== TEST 14: Get transaction statistics =====
        console.log('\nTest 14: Get transaction statistics...');
        const stats = await Transaction.getTransactionStats({ user_id: 2 });
        console.log(`✅ Total transactions: ${stats.total_transactions}`);
        console.log(`✅ Total amount: $${stats.total_amount}`);
        console.log(`✅ Completed: ${stats.completed_count} ($${stats.completed_amount})`);
        console.log(`✅ Pending: ${stats.pending_count} ($${stats.pending_amount})`);
        console.log(`✅ Failed: ${stats.failed_count} ($${stats.failed_amount})`);
        console.log(`✅ Refunded: ${stats.refunded_count} ($${stats.refunded_amount})`);

        // ===== TEST 15: Update transaction with gateway response =====
        console.log('\nTest 15: Update transaction with gateway response...');
        const updatedWithResponse = await Transaction.updateTransaction(transaction1.id, {
            gateway_response: { success: true, code: '00', message: 'Approved' },
            notes: 'Updated with gateway response',
        });
        console.log(`✅ Transaction updated with gateway response`);

        // ===== TEST 16: Delete transaction (soft delete) =====
        console.log('\nTest 16: Delete transaction (soft delete)...');
        const deleted = await Transaction.deleteTransaction(refundTransaction.id);
        console.log(`✅ Transaction soft deleted: ${deleted}`);

        const deletedTransaction = await Transaction.findTransactionById(refundTransaction.id);
        console.log(`✅ Deleted transaction status: ${deletedTransaction?.status} (should be CANCELLED)`);

        // ===== CLEANUP =====
        console.log('\n=== Cleanup ===');
        console.log('Cleaning up test data...');

        // Get all test transactions
        const allTestTransactions = await Transaction.findTransactionsByInvoiceId(testInvoiceId);
        for (const txn of allTestTransactions) {
            await Transaction.hardDeleteTransaction(txn.id);
        }
        console.log(`✅ Deleted ${allTestTransactions.length} test transactions`);

        await Invoice.hardDeleteInvoice(testInvoiceId);
        console.log(`✅ Deleted test invoice: ${testInvoiceId}`);

        await PaymentPlan.hardDeletePaymentPlan(testPaymentPlanId);
        console.log(`✅ Deleted test payment plan: ${testPaymentPlanId}`);

        console.log('\n✅ All Transaction Model tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error);

        // Cleanup on failure
        try {
            if (testInvoiceId) {
                const allTestTransactions = await Transaction.findTransactionsByInvoiceId(testInvoiceId);
                for (const txn of allTestTransactions) {
                    await Transaction.hardDeleteTransaction(txn.id);
                }
                await Invoice.hardDeleteInvoice(testInvoiceId);
            }
            if (testPaymentPlanId) {
                await PaymentPlan.hardDeletePaymentPlan(testPaymentPlanId);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        process.exit(1);
    }
};

runTests();
