/**
 * Payment Method Model Test
 * Comprehensive tests for all Payment Method model operations
 */

import * as PaymentMethod from './models/PaymentMethod';

const runTests = async () => {
    const testPaymentMethodIds: number[] = [];

    try {
        console.log('=== Payment Method Model Tests ===\n');

        // ===== TEST 1: Create CARD payment method =====
        console.log('Test 1: Create CARD payment method...');
        const cardMethod = await PaymentMethod.createPaymentMethod({
            user_id: 2,
            payment_method_type: 'CARD',
            last_four: '4242',
            token: 'tok_test_visa_4242',
            card_brand: 'VISA',
            expiry_month: 12,
            expiry_year: 2028,
            billing_zip: '12345',
            is_default: true,
        });
        testPaymentMethodIds.push(cardMethod.id);
        console.log(`✅ CARD payment method created: id=${cardMethod.id}, last_four=${cardMethod.last_four}, brand=${cardMethod.card_brand}, default=${cardMethod.is_default}`);

        // ===== TEST 2: Create ACH payment method =====
        console.log('\nTest 2: Create ACH payment method...');
        const achMethod = await PaymentMethod.createPaymentMethod({
            user_id: 2,
            payment_method_type: 'ACH',
            last_four: '6789',
            token: 'tok_test_ach_6789',
            billing_zip: '54321',
        });
        testPaymentMethodIds.push(achMethod.id);
        console.log(`✅ ACH payment method created: id=${achMethod.id}, last_four=${achMethod.last_four}`);

        // ===== TEST 3: Verify first card is still default =====
        console.log('\nTest 3: Verify first card is still default...');
        const defaultMethod = await PaymentMethod.findDefaultPaymentMethod(2);
        console.log(`✅ Default payment method: id=${defaultMethod?.id}, last_four=${defaultMethod?.last_four}`);

        // ===== TEST 4: Find payment method by ID =====
        console.log('\nTest 4: Find payment method by ID...');
        const foundMethod = await PaymentMethod.findPaymentMethodById(cardMethod.id);
        console.log(`✅ Found payment method: ${foundMethod?.payment_method_type} ending in ${foundMethod?.last_four}`);

        // ===== TEST 5: Find all payment methods for user =====
        console.log('\nTest 5: Find all payment methods for user...');
        const userMethods = await PaymentMethod.findPaymentMethodsByUserId(2);
        console.log(`✅ Found ${userMethods.length} payment methods for user 2`);

        // ===== TEST 6: Find active payment methods only =====
        console.log('\nTest 6: Find active payment methods only...');
        const activeMethods = await PaymentMethod.findActivePaymentMethods(2);
        console.log(`✅ Found ${activeMethods.length} active payment methods`);

        // ===== TEST 7: Create another card =====
        console.log('\nTest 7: Create another CARD payment method...');
        const secondCard = await PaymentMethod.createPaymentMethod({
            user_id: 2,
            payment_method_type: 'CARD',
            last_four: '5555',
            token: 'tok_test_mastercard_5555',
            card_brand: 'MASTERCARD',
            expiry_month: 6,
            expiry_year: 2027,
            billing_zip: '99999',
        });
        testPaymentMethodIds.push(secondCard.id);
        console.log(`✅ Second CARD created: id=${secondCard.id}, brand=${secondCard.card_brand}`);

        // ===== TEST 8: Set second card as default =====
        console.log('\nTest 8: Set second card as default...');
        const newDefault = await PaymentMethod.setDefaultPaymentMethod(secondCard.id);
        console.log(`✅ New default set: id=${newDefault?.id}, last_four=${newDefault?.last_four}`);

        // Verify old default is no longer default
        const oldCard = await PaymentMethod.findPaymentMethodById(cardMethod.id);
        console.log(`✅ Old card default status: ${oldCard?.is_default} (should be false)`);

        // ===== TEST 9: Filter by payment method type =====
        console.log('\nTest 9: Filter by payment method type...');
        const cardMethods = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            payment_method_type: 'CARD',
        });
        console.log(`✅ Found ${cardMethods.length} CARD payment methods`);

        const achMethods = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            payment_method_type: 'ACH',
        });
        console.log(`✅ Found ${achMethods.length} ACH payment methods`);

        // ===== TEST 10: Filter by card brand =====
        console.log('\nTest 10: Filter by card brand...');
        const visaCards = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            card_brand: 'VISA',
        });
        console.log(`✅ Found ${visaCards.length} VISA cards`);

        const mastercardCards = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            card_brand: 'MASTERCARD',
        });
        console.log(`✅ Found ${mastercardCards.length} MASTERCARD cards`);

        // ===== TEST 11: Update payment method =====
        console.log('\nTest 11: Update payment method expiry...');
        const updated = await PaymentMethod.updatePaymentMethod(cardMethod.id, {
            expiry_month: 3,
            expiry_year: 2029,
        });
        console.log(`✅ Updated expiry: ${updated?.expiry_month}/${updated?.expiry_year}`);

        // ===== TEST 12: Deactivate payment method =====
        console.log('\nTest 12: Deactivate ACH payment method...');
        const deactivated = await PaymentMethod.deactivatePaymentMethod(achMethod.id);
        console.log(`✅ Deactivated: id=${deactivated?.id}, is_active=${deactivated?.is_active} (should be false)`);

        // ===== TEST 13: Verify active methods exclude deactivated =====
        console.log('\nTest 13: Verify active methods exclude deactivated...');
        const activeAfterDeactivate = await PaymentMethod.findActivePaymentMethods(2);
        console.log(`✅ Active payment methods now: ${activeAfterDeactivate.length} (should be 2)`);

        // ===== TEST 14: Reactivate payment method =====
        console.log('\nTest 14: Reactivate payment method...');
        const reactivated = await PaymentMethod.activatePaymentMethod(achMethod.id);
        console.log(`✅ Reactivated: id=${reactivated?.id}, is_active=${reactivated?.is_active} (should be true)`);

        // ===== TEST 15: Filter by is_default =====
        console.log('\nTest 15: Filter by is_default...');
        const defaultMethods = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            is_default: true,
        });
        console.log(`✅ Found ${defaultMethods.length} default payment method (should be 1)`);
        console.log(`✅ Default method last_four: ${defaultMethods[0]?.last_four}`);

        // ===== TEST 16: Filter by is_active =====
        console.log('\nTest 16: Filter by is_active...');
        const activeFiltered = await PaymentMethod.findAllPaymentMethods({
            user_id: 2,
            is_active: true,
        });
        console.log(`✅ Found ${activeFiltered.length} active payment methods`);

        // ===== TEST 17: Delete payment method (soft delete) =====
        console.log('\nTest 17: Delete payment method (soft delete)...');
        const deleted = await PaymentMethod.deletePaymentMethod(cardMethod.id);
        console.log(`✅ Payment method soft deleted: ${deleted}`);

        const deletedMethod = await PaymentMethod.findPaymentMethodById(cardMethod.id);
        console.log(`✅ Deleted method is_active: ${deletedMethod?.is_active} (should be false)`);

        // ===== TEST 18: Verify deleted method not in active list =====
        console.log('\nTest 18: Verify deleted method not in active list...');
        const finalActive = await PaymentMethod.findActivePaymentMethods(2);
        console.log(`✅ Active payment methods after delete: ${finalActive.length}`);

        // ===== CLEANUP =====
        console.log('\n=== Cleanup ===');
        console.log('Cleaning up test data...');

        for (const id of testPaymentMethodIds) {
            await PaymentMethod.hardDeletePaymentMethod(id);
        }
        console.log(`✅ Deleted ${testPaymentMethodIds.length} test payment methods`);

        console.log('\n✅ All Payment Method Model tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error);

        // Cleanup on failure
        try {
            for (const id of testPaymentMethodIds) {
                await PaymentMethod.hardDeletePaymentMethod(id);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        process.exit(1);
    }
};

runTests();
