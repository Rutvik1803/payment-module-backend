/**
 * Test Invoice Fee Model
 * Comprehensive test suite for invoice fee operations
 */

import {
    createInvoiceFee,
    createInvoiceFees,
    findInvoiceFeeById,
    findFeesByInvoiceId,
    findAllInvoiceFees,
    updateInvoiceFee,
    deactivateInvoiceFee,
    reactivateInvoiceFee,
    deleteInvoiceFee,
    calculateTotalFees,
    getInvoiceFeeSummary,
    findFeesByType,
    deactivateAllFeesForInvoice,
} from './models/InvoiceFee';
import { createInvoice } from './models/Invoice';
import { createPaymentPlan } from './models/PaymentPlan';

const testInvoiceFeeModel = async () => {
    let testPlanId: number | undefined;
    let testInvoiceId: number | undefined;
    let testFeeId: number | undefined;
    const createdFeeIds: number[] = [];

    try {
        console.log('\n🧪 Setting up test data...');

        // Create test payment plan
        const testPlan = await createPaymentPlan({
            user_id: 1,
            total_amount: 2000,
            type: 'INSTALLMENT',
            number_of_installments: 4,
            start_date: new Date(),
        });
        testPlanId = testPlan.id;
        console.log(`✅ Created test payment plan: ${testPlanId}`);

        // Create test invoice
        const testInvoice = await createInvoice({
            user_id: 1,
            invoice_number: `TEST-INV-FEE-${Date.now()}`,
            amount: 500,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            payment_plan_id: testPlanId,
        });
        testInvoiceId = testInvoice.id;
        console.log(`✅ Created test invoice: ${testInvoiceId}`);

        // Test 1: Create a single invoice fee
        console.log('\n📝 Test 1: Create single invoice fee (LATE_FEE)');
        const fee1 = await createInvoiceFee({
            invoice_id: testInvoiceId,
            type: 'LATE_FEE',
            amount: 25.00,
            description: 'Late payment fee',
        });
        testFeeId = fee1.id;
        createdFeeIds.push(fee1.id);
        console.log(`✅ Created fee with ID: ${fee1.id}, type: ${fee1.type}, amount: $${fee1.amount}`);

        // Test 2: Find fee by ID
        console.log('\n📝 Test 2: Find fee by ID');
        const foundFee = await findInvoiceFeeById(testFeeId);
        if (!foundFee || foundFee.id !== testFeeId) {
            throw new Error('Failed to find fee by ID');
        }
        console.log(`✅ Found fee: ${foundFee.type}, amount: $${foundFee.amount}`);

        // Test 3: Create multiple fees in bulk
        console.log('\n📝 Test 3: Create multiple fees in bulk');
        const bulkFees = await createInvoiceFees([
            {
                invoice_id: testInvoiceId,
                type: 'PROCESSING_FEE',
                amount: 10.00,
                description: 'Payment processing fee',
            },
            {
                invoice_id: testInvoiceId,
                type: 'SERVICE_CHARGE',
                amount: 15.00,
                description: 'Service charge',
            },
        ]);
        bulkFees.forEach(fee => createdFeeIds.push(fee.id));
        console.log(`✅ Created ${bulkFees.length} fees in bulk`);

        // Test 4: Find all fees for invoice
        console.log('\n📝 Test 4: Find all fees for invoice');
        const invoiceFees = await findFeesByInvoiceId(testInvoiceId);
        if (invoiceFees.length !== 3) {
            throw new Error(`Expected 3 fees, found ${invoiceFees.length}`);
        }
        console.log(`✅ Found ${invoiceFees.length} fees for invoice`);

        // Test 5: Calculate total fees
        console.log('\n📝 Test 5: Calculate total fees for invoice');
        const totalFees = await calculateTotalFees(testInvoiceId);
        const expectedTotal = 25 + 10 + 15;
        if (Number(totalFees) !== expectedTotal) {
            throw new Error(`Expected total $${expectedTotal}, got $${totalFees}`);
        }
        console.log(`✅ Total fees: $${totalFees} (correct)`);

        // Test 6: Get fee summary
        console.log('\n📝 Test 6: Get fee summary for invoice');
        const summary = await getInvoiceFeeSummary(testInvoiceId);
        if (summary.fee_count !== 3 || summary.total_fees !== expectedTotal) {
            throw new Error('Fee summary mismatch');
        }
        console.log(`✅ Fee summary: ${summary.fee_count} fees, total: $${summary.total_fees}`);
        console.log(`   Fees by type:`, summary.fees_by_type);

        // Test 7: Update a fee
        console.log('\n📝 Test 7: Update fee amount and description');
        const updatedFee = await updateInvoiceFee(testFeeId, {
            amount: 30.00,
            description: 'Updated late payment fee',
        });
        if (!updatedFee || Number(updatedFee.amount) !== 30) {
            throw new Error(`Failed to update fee amount, got: ${updatedFee?.amount}`);
        }
        console.log(`✅ Fee updated: amount now $${updatedFee.amount}`);

        // Test 8: Filter fees by type
        console.log('\n📝 Test 8: Find fees by type (LATE_FEE)');
        const lateFees = await findFeesByType('LATE_FEE');
        if (lateFees.length === 0) {
            throw new Error('No late fees found');
        }
        console.log(`✅ Found ${lateFees.length} LATE_FEE(s)`);

        // Test 9: Filter with amount range
        console.log('\n📝 Test 9: Filter fees with amount range');
        const filteredFees = await findAllInvoiceFees({
            invoice_id: testInvoiceId,
            min_amount: 10,
            max_amount: 20,
        });
        if (filteredFees.length !== 2) {
            throw new Error(`Expected 2 fees in range, found ${filteredFees.length}`);
        }
        console.log(`✅ Found ${filteredFees.length} fees in amount range $10-$20`);

        // Test 10: Deactivate a fee (soft delete)
        console.log('\n📝 Test 10: Deactivate a fee (soft delete)');
        const deactivated = await deactivateInvoiceFee(testFeeId);
        if (!deactivated || deactivated.is_active) {
            throw new Error('Failed to deactivate fee');
        }
        console.log(`✅ Fee deactivated: is_active = ${deactivated.is_active}`);

        // Test 11: Verify active fees count decreased
        console.log('\n📝 Test 11: Verify active fees count after deactivation');
        const activeFees = await findFeesByInvoiceId(testInvoiceId, true);
        if (activeFees.length !== 2) {
            throw new Error(`Expected 2 active fees, found ${activeFees.length}`);
        }
        console.log(`✅ Active fees: ${activeFees.length} (deactivated fee excluded)`);

        // Test 12: Calculate total with deactivated fee
        console.log('\n📝 Test 12: Calculate total fees (active only)');
        const activeTotalFees = await calculateTotalFees(testInvoiceId, true);
        const expectedActiveTotal = 10 + 15; // Only PROCESSING_FEE and SERVICE_CHARGE
        if (Number(activeTotalFees) !== expectedActiveTotal) {
            throw new Error(`Expected active total $${expectedActiveTotal}, got $${activeTotalFees}`);
        }
        console.log(`✅ Active fees total: $${activeTotalFees} (correct)`);

        // Test 13: Reactivate the fee
        console.log('\n📝 Test 13: Reactivate the fee');
        const reactivated = await reactivateInvoiceFee(testFeeId);
        if (!reactivated || !reactivated.is_active) {
            throw new Error('Failed to reactivate fee');
        }
        console.log(`✅ Fee reactivated: is_active = ${reactivated.is_active}`);

        // Test 14: Verify reactivated fee is counted
        console.log('\n📝 Test 14: Verify reactivated fee is counted');
        const allActiveFees = await findFeesByInvoiceId(testInvoiceId, true);
        if (allActiveFees.length !== 3) {
            throw new Error(`Expected 3 active fees after reactivation, found ${allActiveFees.length}`);
        }
        console.log(`✅ Active fees after reactivation: ${allActiveFees.length}`);

        // Test 15: Filter by active status
        console.log('\n📝 Test 15: Filter fees by active status');
        const activeFeesFiltered = await findAllInvoiceFees({
            invoice_id: testInvoiceId,
            is_active: true,
        });
        if (activeFeesFiltered.length !== 3) {
            throw new Error(`Expected 3 active fees in filter, found ${activeFeesFiltered.length}`);
        }
        console.log(`✅ Filtered active fees: ${activeFeesFiltered.length}`);

        // Test 16: Create fees with different types
        console.log('\n📝 Test 16: Create fees with various types');
        const diverseFees = await createInvoiceFees([
            { invoice_id: testInvoiceId, type: 'PENALTY', amount: 50.00 },
            { invoice_id: testInvoiceId, type: 'NSF_FEE', amount: 35.00 },
            { invoice_id: testInvoiceId, type: 'OTHER', amount: 5.00 },
        ]);
        diverseFees.forEach(fee => createdFeeIds.push(fee.id));
        console.log(`✅ Created ${diverseFees.length} fees with different types`);

        // Test 17: Get updated fee summary
        console.log('\n📝 Test 17: Get updated fee summary with all types');
        const fullSummary = await getInvoiceFeeSummary(testInvoiceId);
        console.log(`✅ Full summary: ${fullSummary.fee_count} fees, total: $${fullSummary.total_fees}`);
        console.log(`   Fee types:`, fullSummary.fees_by_type.map(f => `${f.type}: $${f.amount}`).join(', '));

        // Test 18: Deactivate all fees for invoice
        console.log('\n📝 Test 18: Deactivate all fees for invoice');
        const deactivatedCount = await deactivateAllFeesForInvoice(testInvoiceId);
        console.log(`✅ Deactivated ${deactivatedCount} fees`);

        // Test 19: Verify all fees are deactivated
        console.log('\n📝 Test 19: Verify all fees are deactivated');
        const remainingActive = await findFeesByInvoiceId(testInvoiceId, true);
        if (remainingActive.length !== 0) {
            throw new Error(`Expected 0 active fees, found ${remainingActive.length}`);
        }
        console.log(`✅ All fees deactivated: ${remainingActive.length} active fees remaining`);

        // Test 20: Find all fees including inactive
        console.log('\n📝 Test 20: Find all fees including inactive');
        const allFeesIncludingInactive = await findFeesByInvoiceId(testInvoiceId, false);
        if (allFeesIncludingInactive.length !== 6) {
            throw new Error(`Expected 6 total fees, found ${allFeesIncludingInactive.length}`);
        }
        console.log(`✅ Total fees (including inactive): ${allFeesIncludingInactive.length}`);

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        for (const feeId of createdFeeIds) {
            await deleteInvoiceFee(feeId);
        }
        console.log(`✅ Deleted ${createdFeeIds.length} test fees`);

        // Delete test invoice (will cascade delete remaining fees if any)
        if (testInvoiceId) {
            await pool.query('DELETE FROM invoices WHERE id = $1', [testInvoiceId]);
            console.log(`✅ Deleted test invoice: ${testInvoiceId}`);
        }

        // Delete test payment plan
        if (testPlanId) {
            await pool.query('DELETE FROM payment_plans WHERE id = $1', [testPlanId]);
            console.log(`✅ Deleted test payment plan: ${testPlanId}`);
        }

        console.log('\n✅ All Invoice Fee Model tests passed!');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);

        // Cleanup on error
        try {
            if (createdFeeIds.length > 0) {
                console.log('\n🧹 Cleaning up after error...');
                for (const feeId of createdFeeIds) {
                    await deleteInvoiceFee(feeId);
                }
            }
            if (testInvoiceId) {
                await pool.query('DELETE FROM invoices WHERE id = $1', [testInvoiceId]);
            }
            if (testPlanId) {
                await pool.query('DELETE FROM payment_plans WHERE id = $1', [testPlanId]);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        process.exit(1);
    }
};

// Import pool for cleanup
import pool from './config/database';

testInvoiceFeeModel();
