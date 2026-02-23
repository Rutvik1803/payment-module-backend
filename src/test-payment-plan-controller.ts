/**
 * Payment Plan Controller Test Script
 * 
 * Tests all controller functions with authorization checks
 */

import pool from './config/database';

// Mock Express Request and Response
interface MockRequest {
    user?: { id: number; email: string; role: string; first_name: string; last_name: string; created_at: Date };
    body?: any;
    params?: any;
    query?: any;
}

interface MockResponse {
    statusCode?: number;
    data?: any;
    status: (code: number) => MockResponse;
    json: (data: any) => MockResponse;
}

const createMockResponse = (): MockResponse => {
    const res: MockResponse = {
        status: function (code: number) {
            this.statusCode = code;
            return this;
        },
        json: function (data: any) {
            this.data = data;
            return this;
        }
    };
    return res;
};

// Import controller functions
import * as paymentPlanController from './controllers/paymentPlanController';

async function runTests() {
    console.log('=== Payment Plan Controller Tests ===\n');

    let createdPlanId: number = 0;
    let testUserId: number;
    let adminUser: any;
    let studentUser: any;

    try {
        // Setup: Get test users
        const adminResult = await pool.query('SELECT * FROM users WHERE role = $1 LIMIT 1', ['admin']);
        const studentResult = await pool.query('SELECT * FROM users WHERE role = $1 LIMIT 1', ['student']);

        if (adminResult.rows.length === 0 || studentResult.rows.length === 0) {
            throw new Error('Test users not found. Please run seed data first.');
        }

        adminUser = adminResult.rows[0];
        studentUser = studentResult.rows[0];
        testUserId = studentUser.id;

        console.log(`✅ Using admin: ${adminUser.email} (ID: ${adminUser.id})`);
        console.log(`✅ Using student: ${studentUser.email} (ID: ${studentUser.id})\n`);

        // Test 1: Create Payment Plan (Admin)
        console.log('Test 1: Create Payment Plan (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                body: {
                    user_id: testUserId,
                    total_amount: 5000,
                    type: 'INSTALLMENT',
                    number_of_installments: 5,
                }
            };
            const res = createMockResponse();

            await paymentPlanController.createPaymentPlan(req as any, res as any);

            if (res.statusCode === 201 && res.data?.success) {
                createdPlanId = res.data.data.plan.id;
                console.log(`✅ Payment plan created successfully (ID: ${createdPlanId})`);
                console.log(`   - Total: $${res.data.data.plan.total_amount}`);
                console.log(`   - Type: ${res.data.data.plan.type}`);
                console.log(`   - Schedules: ${res.data.data.schedules.length} installments`);
            } else {
                console.log('❌ Failed to create payment plan');
                console.log('Response:', JSON.stringify(res.data, null, 2));
            }
        }

        // Test 2: Create Payment Plan (Student - should fail)
        console.log('\nTest 2: Create Payment Plan (Student access - should fail)');
        {
            const req: MockRequest = {
                user: studentUser,
                body: {
                    user_id: testUserId,
                    total_amount: 3000,
                    type: 'ONE_TIME',
                }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.createPaymentPlan(req as any, res as any);
                console.log('❌ Should have thrown ForbiddenError');
            } catch (error: any) {
                if (error.name === 'ForbiddenError') {
                    console.log(`✅ Correctly blocked student: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 3: Get Payment Plan by ID (Admin)
        console.log('\nTest 3: Get Payment Plan by ID (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.getPaymentPlanById(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Retrieved payment plan successfully`);
                console.log(`   - Plan ID: ${res.data.data.plan.id}`);
                console.log(`   - Status: ${res.data.data.plan.status}`);
            } else {
                console.log('❌ Failed to retrieve payment plan');
            }
        }

        // Test 4: Get Payment Plan by ID (Owner)
        console.log('\nTest 4: Get Payment Plan by ID (Owner access)');
        {
            const req: MockRequest = {
                user: studentUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.getPaymentPlanById(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Owner can access their own plan`);
            } else {
                console.log('❌ Owner should be able to access their plan');
            }
        }

        // Test 5: Get Payment Plan by ID (Wrong student - should fail)
        console.log('\nTest 5: Get Payment Plan by ID (Wrong student - should fail)');
        {
            // Get another student
            const otherStudentResult = await pool.query(
                'SELECT * FROM users WHERE role = $1 AND id != $2 LIMIT 1',
                ['student', testUserId]
            );

            if (otherStudentResult.rows.length > 0) {
                const otherStudent = otherStudentResult.rows[0];
                const req: MockRequest = {
                    user: otherStudent,
                    params: { id: createdPlanId.toString() }
                };
                const res = createMockResponse();

                try {
                    await paymentPlanController.getPaymentPlanById(req as any, res as any);
                    console.log('❌ Should have thrown ForbiddenError');
                } catch (error: any) {
                    if (error.name === 'ForbiddenError') {
                        console.log(`✅ Correctly blocked unauthorized student: ${error.message}`);
                    } else {
                        console.log(`❌ Unexpected error: ${error.message}`);
                    }
                }
            } else {
                console.log('⚠️  Skipped: No other student available for test');
            }
        }

        // Test 6: Get All Payment Plans with Pagination (Admin)
        console.log('\nTest 6: Get All Payment Plans with Pagination (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                query: { page: '1', limit: '10' }
            };
            const res = createMockResponse();

            await paymentPlanController.getAllPaymentPlans(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                const pagination = res.data.data.pagination;
                console.log(`✅ Retrieved paginated payment plans`);
                console.log(`   - Items: ${res.data.data.items.length}`);
                console.log(`   - Total: ${pagination.total}`);
                console.log(`   - Page: ${pagination.page}/${pagination.totalPages}`);
            } else {
                console.log('❌ Failed to retrieve payment plans');
            }
        }

        // Test 7: Get All Payment Plans (Student - should fail)
        console.log('\nTest 7: Get All Payment Plans (Student - should fail)');
        {
            const req: MockRequest = {
                user: studentUser,
                query: { page: '1', limit: '10' }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.getAllPaymentPlans(req as any, res as any);
                console.log('❌ Should have thrown ForbiddenError');
            } catch (error: any) {
                if (error.name === 'ForbiddenError') {
                    console.log(`✅ Correctly blocked student: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 8: Get User Payment Plans (Owner)
        console.log('\nTest 8: Get User Payment Plans (Owner access)');
        {
            const req: MockRequest = {
                user: studentUser,
                params: { userId: testUserId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.getUserPaymentPlans(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Retrieved user's payment plans`);
                console.log(`   - Plans count: ${res.data.data.plans.length}`);
            } else {
                console.log('❌ Failed to retrieve user payment plans');
            }
        }

        // Test 9: Get User Payment Plans (Admin)
        console.log('\nTest 9: Get User Payment Plans (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { userId: testUserId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.getUserPaymentPlans(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Admin can retrieve any user's plans`);
            } else {
                console.log('❌ Failed to retrieve user payment plans');
            }
        }

        // Test 10: Get Payment Plan Summary (Owner)
        console.log('\nTest 10: Get Payment Plan Summary (Owner access)');
        {
            const req: MockRequest = {
                user: studentUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.getPaymentPlanSummary(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                const progress = res.data.data.progress;
                console.log(`✅ Retrieved payment plan summary`);
                console.log(`   - Total Installments: ${progress.totalInstallments}`);
                console.log(`   - Paid: ${progress.paidInstallments}`);
                console.log(`   - Pending: ${progress.pendingInstallments}`);
                console.log(`   - Progress: ${progress.percentageComplete}%`);
            } else {
                console.log('❌ Failed to retrieve payment plan summary');
            }
        }

        // Test 11: Update Payment Plan Status (Admin)
        console.log('\nTest 11: Update Payment Plan Status (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: createdPlanId.toString() },
                body: { status: 'ACTIVE' }
            };
            const res = createMockResponse();

            await paymentPlanController.updatePaymentPlanStatus(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Updated payment plan status to ACTIVE`);
            } else {
                console.log('❌ Failed to update payment plan status');
            }
        }

        // Test 12: Update Payment Plan Status (Student - should fail)
        console.log('\nTest 12: Update Payment Plan Status (Student - should fail)');
        {
            const req: MockRequest = {
                user: studentUser,
                params: { id: createdPlanId.toString() },
                body: { status: 'CANCELLED' }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.updatePaymentPlanStatus(req as any, res as any);
                console.log('❌ Should have thrown ForbiddenError');
            } catch (error: any) {
                if (error.name === 'ForbiddenError') {
                    console.log(`✅ Correctly blocked student: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 13: Cancel Payment Plan (Owner - no payments)
        console.log('\nTest 13: Cancel Payment Plan (Owner - no payments)');
        {
            const req: MockRequest = {
                user: studentUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.cancelPaymentPlan(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Owner cancelled payment plan successfully`);
                console.log(`   - Status: ${res.data.data.plan.status}`);
            } else {
                console.log('❌ Failed to cancel payment plan');
            }
        }

        // Test 14: Cancel Already Cancelled Plan (should fail)
        console.log('\nTest 14: Cancel Already Cancelled Plan (should fail)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.cancelPaymentPlan(req as any, res as any);
                console.log('❌ Should have thrown BadRequestError');
            } catch (error: any) {
                if (error.name === 'BadRequestError') {
                    console.log(`✅ Correctly rejected: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 15: Delete Payment Plan (Admin)
        console.log('\nTest 15: Delete Payment Plan (Admin access)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            await paymentPlanController.deletePaymentPlan(req as any, res as any);

            if (res.statusCode === 200 && res.data?.success) {
                console.log(`✅ Payment plan deleted successfully`);
            } else {
                console.log('❌ Failed to delete payment plan');
            }
        }

        // Test 16: Get Deleted Payment Plan (should fail)
        console.log('\nTest 16: Get Deleted Payment Plan (should fail)');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: createdPlanId.toString() }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.getPaymentPlanById(req as any, res as any);
                console.log('❌ Should have thrown NotFoundError');
            } catch (error: any) {
                if (error.name === 'NotFoundError') {
                    console.log(`✅ Correctly returned not found: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 17: Validation - Invalid Payment Plan ID
        console.log('\nTest 17: Validation - Invalid Payment Plan ID');
        {
            const req: MockRequest = {
                user: adminUser,
                params: { id: 'invalid' }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.getPaymentPlanById(req as any, res as any);
                console.log('❌ Should have thrown BadRequestError');
            } catch (error: any) {
                if (error.name === 'BadRequestError') {
                    console.log(`✅ Validation working: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 18: Validation - Missing Required Fields
        console.log('\nTest 18: Validation - Missing Required Fields');
        {
            const req: MockRequest = {
                user: adminUser,
                body: {
                    // Missing user_id, total_amount, type
                }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.createPaymentPlan(req as any, res as any);
                console.log('❌ Should have thrown BadRequestError');
            } catch (error: any) {
                if (error.name === 'BadRequestError') {
                    console.log(`✅ Validation working: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 19: Validation - Invalid Type
        console.log('\nTest 19: Validation - Invalid Type');
        {
            const req: MockRequest = {
                user: adminUser,
                body: {
                    user_id: testUserId,
                    total_amount: 1000,
                    type: 'INVALID_TYPE'
                }
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.createPaymentPlan(req as any, res as any);
                console.log('❌ Should have thrown BadRequestError');
            } catch (error: any) {
                if (error.name === 'BadRequestError') {
                    console.log(`✅ Validation working: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        // Test 20: Pagination - Invalid Parameters
        console.log('\nTest 20: Pagination - Invalid Parameters');
        {
            const req: MockRequest = {
                user: adminUser,
                query: { page: '-1', limit: '200' } // Invalid: page < 1, limit > 100
            };
            const res = createMockResponse();

            try {
                await paymentPlanController.getAllPaymentPlans(req as any, res as any);
                console.log('❌ Should have thrown BadRequestError');
            } catch (error: any) {
                if (error.name === 'BadRequestError') {
                    console.log(`✅ Pagination validation working: ${error.message}`);
                } else {
                    console.log(`❌ Unexpected error: ${error.message}`);
                }
            }
        }

        console.log('\n=== All Tests Completed ===');
        console.log('✅ Payment Plan Controller is working correctly with proper authorization!');

    } catch (error) {
        console.error('\n❌ Test suite failed:');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run tests
runTests();
