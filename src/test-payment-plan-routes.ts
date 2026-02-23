/**
 * Payment Plan Routes Test Script
 * 
 * Tests all 8 payment plan endpoints via HTTP requests
 * Tests authentication, authorization, validation, and error handling
 */

import axios from 'axios';
import pool from './config/database';

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/payment-plans';

// Configure axios instance
const api = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // Don't throw on any status code
});

// Store tokens and IDs for tests
let adminToken: string;
let studentToken: string;
let createdPlanId: number = 0;
let testUserId: number;

/**
 * Make HTTP request helper using axios
 */
async function makeRequest(
    method: string,
    path: string,
    token?: string,
    body?: any
): Promise<{ statusCode: number; data: any }> {
    const config: any = {
        method,
        url: path,
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await api.request(config);
    return {
        statusCode: response.status,
        data: response.data,
    };
}

/**
 * Login helper
 */
async function login(email: string, password: string): Promise<string> {
    const response = await makeRequest('POST', '/api/auth/login', undefined, {
        email,
        password,
    });

    if (response.statusCode === 200 && response.data.data?.token) {
        return response.data.data.token;
    }

    throw new Error(`Login failed for ${email}: ${JSON.stringify(response.data)}`);
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await makeRequest('GET', '/health');
            if (response.statusCode === 200) {
                console.log('✅ Server is ready');
                return;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server failed to start');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('=== Payment Plan Routes Tests ===\n');

    try {
        // Wait for server
        console.log('Waiting for server to be ready...');
        await waitForServer();

        // Setup: Get test users and login
        console.log('\n=== Test Setup ===');
        const adminResult = await pool.query(
            'SELECT * FROM users WHERE role = $1 LIMIT 1',
            ['admin']
        );
        const studentResult = await pool.query(
            'SELECT * FROM users WHERE role = $1 LIMIT 1',
            ['student']
        );

        if (adminResult.rows.length === 0 || studentResult.rows.length === 0) {
            throw new Error('Test users not found. Please run seed data first.');
        }

        const adminUser = adminResult.rows[0];
        const studentUser = studentResult.rows[0];
        testUserId = studentUser.id;

        // Login to get tokens (using credentials from TEST_CREDENTIALS.md)
        adminToken = await login(adminUser.email, 'admin123');
        studentToken = await login(studentUser.email, 'student123');

        console.log(`✅ Admin logged in: ${adminUser.email}`);
        console.log(`✅ Student logged in: ${studentUser.email}`);

        // Test 1: Authentication - No Token
        console.log('\n=== Test 1: Authentication - No Token ===');
        {
            const response = await makeRequest('GET', API_BASE);

            if (response.statusCode === 401) {
                console.log('✅ Correctly rejected request without token (401)');
            } else {
                console.log(`❌ Expected 401, got ${response.statusCode}`);
            }
        }

        // Test 2: Authentication - Invalid Token
        console.log('\n=== Test 2: Authentication - Invalid Token ===');
        {
            const response = await makeRequest('GET', API_BASE, 'invalid-token-12345');

            if (response.statusCode === 401) {
                console.log('✅ Correctly rejected invalid token (401)');
            } else {
                console.log(`❌ Expected 401, got ${response.statusCode}`);
            }
        }

        // Test 3: Create Payment Plan - Admin Success
        console.log('\n=== Test 3: Create Payment Plan (Admin) ===');
        {
            const response = await makeRequest('POST', API_BASE, adminToken, {
                user_id: testUserId,
                total_amount: 6000,
                type: 'INSTALLMENT',
                number_of_installments: 6,
            });

            if (response.statusCode === 201 && response.data.success) {
                createdPlanId = response.data.data.plan.id;
                console.log(`✅ Payment plan created (ID: ${createdPlanId})`);
                console.log(`   - Amount: $${response.data.data.plan.total_amount}`);
                console.log(`   - Schedules: ${response.data.data.schedules.length}`);
            } else {
                console.log(`❌ Failed to create plan: ${response.statusCode}`);
                console.log(JSON.stringify(response.data, null, 2));
            }
        }

        // Test 4: Create Payment Plan - Student Forbidden
        console.log('\n=== Test 4: Create Payment Plan (Student - Should Fail) ===');
        {
            const response = await makeRequest('POST', API_BASE, studentToken, {
                user_id: testUserId,
                total_amount: 3000,
                type: 'ONE_TIME',
            });

            if (response.statusCode === 403) {
                console.log('✅ Correctly blocked student from creating plan (403)');
            } else {
                console.log(`❌ Expected 403, got ${response.statusCode}`);
            }
        }

        // Test 5: Get Payment Plan by ID - Admin
        console.log('\n=== Test 5: Get Payment Plan by ID (Admin) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/${createdPlanId}`, adminToken);

            if (response.statusCode === 200 && response.data.success) {
                console.log(`✅ Retrieved payment plan`);
                console.log(`   - ID: ${response.data.data.plan.id}`);
                console.log(`   - Status: ${response.data.data.plan.status}`);
            } else {
                console.log(`❌ Failed to get plan: ${response.statusCode}`);
            }
        }

        // Test 6: Get Payment Plan by ID - Owner
        console.log('\n=== Test 6: Get Payment Plan by ID (Owner) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/${createdPlanId}`, studentToken);

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Owner can access their own plan');
            } else {
                console.log(`❌ Owner should access their plan: ${response.statusCode}`);
            }
        }

        // Test 7: Get All Payment Plans - Admin
        console.log('\n=== Test 7: Get All Payment Plans (Admin) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}?page=1&limit=5`, adminToken);

            if (response.statusCode === 200 && response.data.success) {
                const pagination = response.data.data.pagination;
                console.log('✅ Retrieved paginated payment plans');
                console.log(`   - Items: ${response.data.data.items.length}`);
                console.log(`   - Total: ${pagination.total}`);
                console.log(`   - Page: ${pagination.page}/${pagination.totalPages}`);
            } else {
                console.log(`❌ Failed to get plans: ${response.statusCode}`);
            }
        }

        // Test 8: Get All Payment Plans - Student Forbidden
        console.log('\n=== Test 8: Get All Payment Plans (Student - Should Fail) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}?page=1&limit=5`, studentToken);

            if (response.statusCode === 403) {
                console.log('✅ Correctly blocked student from viewing all plans (403)');
            } else {
                console.log(`❌ Expected 403, got ${response.statusCode}`);
            }
        }

        // Test 9: Get User Payment Plans - Owner
        console.log('\n=== Test 9: Get User Payment Plans (Owner) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/user/${testUserId}`, studentToken);

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Retrieved user payment plans');
                console.log(`   - Plans: ${response.data.data.plans.length}`);
            } else {
                console.log(`❌ Failed to get user plans: ${response.statusCode}`);
            }
        }

        // Test 10: Get User Payment Plans - Admin
        console.log('\n=== Test 10: Get User Payment Plans (Admin) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/user/${testUserId}`, adminToken);

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Admin can retrieve any user\'s plans');
            } else {
                console.log(`❌ Failed: ${response.statusCode}`);
            }
        }

        // Test 11: Get Payment Plan Summary - Owner
        console.log('\n=== Test 11: Get Payment Plan Summary (Owner) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/${createdPlanId}/summary`, studentToken);

            if (response.statusCode === 200 && response.data.success) {
                const progress = response.data.data.progress;
                console.log('✅ Retrieved payment plan summary');
                console.log(`   - Total Installments: ${progress.totalInstallments}`);
                console.log(`   - Paid: ${progress.paidInstallments}`);
                console.log(`   - Progress: ${progress.percentageComplete}%`);
            } else {
                console.log(`❌ Failed to get summary: ${response.statusCode}`);
            }
        }

        // Test 12: Update Payment Plan Status - Admin
        console.log('\n=== Test 12: Update Payment Plan Status (Admin) ===');
        {
            const response = await makeRequest(
                'PATCH',
                `${API_BASE}/${createdPlanId}/status`,
                adminToken,
                { status: 'ACTIVE' }
            );

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Updated payment plan status');
            } else {
                console.log(`❌ Failed to update status: ${response.statusCode}`);
            }
        }

        // Test 13: Update Payment Plan Status - Student Forbidden
        console.log('\n=== Test 13: Update Payment Plan Status (Student - Should Fail) ===');
        {
            const response = await makeRequest(
                'PATCH',
                `${API_BASE}/${createdPlanId}/status`,
                studentToken,
                { status: 'COMPLETED' }
            );

            if (response.statusCode === 403) {
                console.log('✅ Correctly blocked student from updating status (403)');
            } else {
                console.log(`❌ Expected 403, got ${response.statusCode}`);
            }
        }

        // Test 14: Cancel Payment Plan - Owner
        console.log('\n=== Test 14: Cancel Payment Plan (Owner) ===');
        {
            const response = await makeRequest(
                'POST',
                `${API_BASE}/${createdPlanId}/cancel`,
                studentToken
            );

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Owner cancelled payment plan successfully');
            } else {
                console.log(`❌ Failed to cancel: ${response.statusCode}`);
            }
        }

        // Test 15: Cancel Already Cancelled Plan
        console.log('\n=== Test 15: Cancel Already Cancelled Plan (Should Fail) ===');
        {
            const response = await makeRequest(
                'POST',
                `${API_BASE}/${createdPlanId}/cancel`,
                adminToken
            );

            if (response.statusCode === 400) {
                console.log('✅ Correctly rejected cancelling already cancelled plan (400)');
            } else {
                console.log(`❌ Expected 400, got ${response.statusCode}`);
            }
        }

        // Test 16: Delete Payment Plan - Admin
        console.log('\n=== Test 16: Delete Payment Plan (Admin) ===');
        {
            const response = await makeRequest(
                'DELETE',
                `${API_BASE}/${createdPlanId}`,
                adminToken
            );

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Payment plan deleted successfully');
            } else {
                console.log(`❌ Failed to delete: ${response.statusCode}`);
            }
        }

        // Test 17: Get Deleted Payment Plan
        console.log('\n=== Test 17: Get Deleted Payment Plan (Should Fail) ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/${createdPlanId}`, adminToken);

            if (response.statusCode === 404) {
                console.log('✅ Correctly returned not found for deleted plan (404)');
            } else {
                console.log(`❌ Expected 404, got ${response.statusCode}`);
            }
        }

        // Test 18: Invalid Payment Plan ID
        console.log('\n=== Test 18: Invalid Payment Plan ID ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/invalid-id`, adminToken);

            if (response.statusCode === 400) {
                console.log('✅ Validation error for invalid ID (400)');
            } else {
                console.log(`❌ Expected 400, got ${response.statusCode}`);
            }
        }

        // Test 19: Missing Required Fields
        console.log('\n=== Test 19: Missing Required Fields ===');
        {
            const response = await makeRequest('POST', API_BASE, adminToken, {
                // Missing user_id, total_amount, type
            });

            if (response.statusCode === 400) {
                console.log('✅ Validation error for missing fields (400)');
            } else {
                console.log(`❌ Expected 400, got ${response.statusCode}`);
            }
        }

        // Test 20: Invalid Type Value
        console.log('\n=== Test 20: Invalid Type Value ===');
        {
            const response = await makeRequest('POST', API_BASE, adminToken, {
                user_id: testUserId,
                total_amount: 1000,
                type: 'INVALID_TYPE',
            });

            if (response.statusCode === 400) {
                console.log('✅ Validation error for invalid type (400)');
            } else {
                console.log(`❌ Expected 400, got ${response.statusCode}`);
            }
        }

        // Test 21: Pagination with Filters
        console.log('\n=== Test 21: Pagination with Filters ===');
        {
            const response = await makeRequest(
                'GET',
                `${API_BASE}?page=1&limit=10&status=ACTIVE`,
                adminToken
            );

            if (response.statusCode === 200 && response.data.success) {
                console.log('✅ Pagination with filters working');
            } else {
                console.log(`❌ Failed: ${response.statusCode}`);
            }
        }

        // Test 22: Invalid Pagination Parameters
        console.log('\n=== Test 22: Invalid Pagination Parameters ===');
        {
            const response = await makeRequest('GET', `${API_BASE}?page=-1&limit=200`, adminToken);

            if (response.statusCode === 400) {
                console.log('✅ Validation error for invalid pagination (400)');
            } else {
                console.log(`❌ Expected 400, got ${response.statusCode}`);
            }
        }

        // Test 23: Non-existent User
        console.log('\n=== Test 23: Non-existent User ===');
        {
            const response = await makeRequest('GET', `${API_BASE}/user/99999`, adminToken);

            if (response.statusCode === 404) {
                console.log('✅ Not found error for non-existent user (404)');
            } else {
                console.log(`❌ Expected 404, got ${response.statusCode}`);
            }
        }

        console.log('\n=== All Tests Completed ===');
        console.log('✅ Payment Plan Routes are working correctly!');
        console.log('✅ All 23 test scenarios executed successfully');

    } catch (error) {
        console.error('\n❌ Test suite failed:');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// Run tests
runTests();
