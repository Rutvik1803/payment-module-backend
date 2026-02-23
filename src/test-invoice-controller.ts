/**
 * Invoice Controller Test Script
 * 
 * Tests all invoice controller endpoints with axios
 * Tests authentication, authorization, validation, and error handling
 */

import axios from 'axios';
import pool from './config/database';

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/invoices';

// Configure axios instance
const api = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // Don't throw on any status code
});

// Store tokens and IDs for tests
let adminToken: string;
let studentToken: string;
let testInvoiceId: number = 0;
let testPaymentPlanId: number = 0;
let studentUserId: number;

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
            const response = await makeRequest('GET', '/health', undefined);
            if (response.statusCode === 200) {
                return;
            }
        } catch (error) {
            // Server not ready
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Server did not become ready in time');
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('=== Invoice Controller Tests ===\n');

    try {
        // Wait for server
        console.log('Waiting for server to be ready...');
        await waitForServer();
        console.log('✅ Server is ready\n');

        // Setup: Login
        console.log('=== Test Setup ===');
        adminToken = await login('admin@coursekey.com', 'admin123');
        console.log('✅ Admin logged in: admin@coursekey.com');

        studentToken = await login('john.doe@example.com', 'student123');
        console.log('✅ Student logged in: john.doe@example.com');

        // Get student user ID
        const studentUserQuery = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            ['john.doe@example.com']
        );
        studentUserId = studentUserQuery.rows[0].id;

        // Find an existing invoice for testing
        const invoiceQuery = await pool.query(
            'SELECT id, user_id, payment_plan_id FROM invoices WHERE user_id = $1 LIMIT 1',
            [studentUserId]
        );

        if (invoiceQuery.rows.length > 0) {
            testInvoiceId = invoiceQuery.rows[0].id;
            testPaymentPlanId = invoiceQuery.rows[0].payment_plan_id;
            console.log(`✅ Found test invoice: ${testInvoiceId}`);
        } else {
            console.log('⚠️  No existing invoices found, some tests may be skipped');
        }

        console.log('');

        // Test 1: Authentication - No Token
        console.log('=== Test 1: Authentication - No Token ===');
        const noTokenResponse = await makeRequest('GET', API_BASE);
        if (noTokenResponse.statusCode === 401) {
            console.log('✅ Correctly rejected request without token (401)\n');
        } else {
            console.log(`❌ Expected 401, got ${noTokenResponse.statusCode}\n`);
        }

        // Test 2: Authentication - Invalid Token
        console.log('=== Test 2: Authentication - Invalid Token ===');
        const invalidTokenResponse = await makeRequest('GET', API_BASE, 'invalid-token');
        if (invalidTokenResponse.statusCode === 401) {
            console.log('✅ Correctly rejected invalid token (401)\n');
        } else {
            console.log(`❌ Expected 401, got ${invalidTokenResponse.statusCode}\n`);
        }

        // Test 3: Get All Invoices (Admin)
        console.log('=== Test 3: Get All Invoices (Admin) ===');
        const allInvoicesResponse = await makeRequest('GET', `${API_BASE}?page=1&limit=5`, adminToken);
        if (allInvoicesResponse.statusCode === 200) {
            const invoices = allInvoicesResponse.data.data.invoices;
            const pagination = allInvoicesResponse.data.data.pagination;
            console.log('✅ Retrieved paginated invoices');
            console.log(`   - Items: ${invoices.length}`);
            console.log(`   - Total: ${pagination.total}`);
            console.log(`   - Page: ${pagination.page}/${pagination.totalPages}\n`);
        } else {
            console.log(`❌ Failed to get all invoices: ${allInvoicesResponse.statusCode}\n`);
        }

        // Test 4: Get All Invoices (Student - Should Fail)
        console.log('=== Test 4: Get All Invoices (Student - Should Fail) ===');
        const studentAllResponse = await makeRequest('GET', API_BASE, studentToken);
        if (studentAllResponse.statusCode === 403) {
            console.log('✅ Correctly blocked student from viewing all invoices (403)\n');
        } else {
            console.log(`❌ Expected 403, got ${studentAllResponse.statusCode}\n`);
        }

        if (testInvoiceId > 0) {
            // Test 5: Get Invoice by ID (Admin)
            console.log('=== Test 5: Get Invoice by ID (Admin) ===');
            const invoiceByIdResponse = await makeRequest(
                'GET',
                `${API_BASE}/${testInvoiceId}`,
                adminToken
            );
            if (invoiceByIdResponse.statusCode === 200) {
                const invoice = invoiceByIdResponse.data.data.invoice;
                console.log('✅ Retrieved invoice');
                console.log(`   - ID: ${invoice.id}`);
                console.log(`   - Invoice Number: ${invoice.invoice_number}`);
                console.log(`   - Status: ${invoice.status}\n`);
            } else {
                console.log(`❌ Failed to get invoice: ${invoiceByIdResponse.statusCode}\n`);
            }

            // Test 6: Get Invoice by ID (Owner)
            console.log('=== Test 6: Get Invoice by ID (Owner) ===');
            const ownerInvoiceResponse = await makeRequest(
                'GET',
                `${API_BASE}/${testInvoiceId}`,
                studentToken
            );
            if (ownerInvoiceResponse.statusCode === 200) {
                console.log('✅ Owner can access their own invoice\n');
            } else {
                console.log(`❌ Owner failed to access invoice: ${ownerInvoiceResponse.statusCode}\n`);
            }
        }

        // Test 7: Get User Invoices (Owner)
        console.log('=== Test 7: Get User Invoices (Owner) ===');
        const userInvoicesResponse = await makeRequest(
            'GET',
            `${API_BASE}/user/${studentUserId}?page=1&limit=10`,
            studentToken
        );
        if (userInvoicesResponse.statusCode === 200) {
            const invoices = userInvoicesResponse.data.data.invoices;
            console.log('✅ Retrieved user invoices');
            console.log(`   - Invoices: ${invoices.length}\n`);
        } else {
            console.log(`❌ Failed to get user invoices: ${userInvoicesResponse.statusCode}\n`);
        }

        // Test 8: Get User Invoices (Admin for another user)
        console.log('=== Test 8: Get User Invoices (Admin) ===');
        const adminUserInvoicesResponse = await makeRequest(
            'GET',
            `${API_BASE}/user/${studentUserId}`,
            adminToken
        );
        if (adminUserInvoicesResponse.statusCode === 200) {
            console.log('✅ Admin can retrieve any user\'s invoices\n');
        } else {
            console.log(`❌ Admin failed to get user invoices: ${adminUserInvoicesResponse.statusCode}\n`);
        }

        // Test 9: Get User Invoices (Non-owner - Should Fail)
        console.log('=== Test 9: Get User Invoices (Non-owner - Should Fail) ===');
        const adminUserId = 1; // Admin user ID
        const forbiddenUserResponse = await makeRequest(
            'GET',
            `${API_BASE}/user/${adminUserId}`,
            studentToken
        );
        if (forbiddenUserResponse.statusCode === 403) {
            console.log('✅ Correctly blocked non-owner from viewing invoices (403)\n');
        } else {
            console.log(`❌ Expected 403, got ${forbiddenUserResponse.statusCode}\n`);
        }

        if (testPaymentPlanId) {
            // Test 10: Get Invoices by Payment Plan (Admin)
            console.log('=== Test 10: Get Invoices by Payment Plan (Admin) ===');
            const planInvoicesResponse = await makeRequest(
                'GET',
                `${API_BASE}/payment-plan/${testPaymentPlanId}`,
                adminToken
            );
            if (planInvoicesResponse.statusCode === 200) {
                const invoices = planInvoicesResponse.data.data.invoices;
                console.log('✅ Retrieved payment plan invoices');
                console.log(`   - Invoices: ${invoices.length}\n`);
            } else {
                console.log(`❌ Failed to get plan invoices: ${planInvoicesResponse.statusCode}\n`);
            }

            // Test 11: Get Invoices by Payment Plan (Owner)
            console.log('=== Test 11: Get Invoices by Payment Plan (Owner) ===');
            const ownerPlanResponse = await makeRequest(
                'GET',
                `${API_BASE}/payment-plan/${testPaymentPlanId}`,
                studentToken
            );
            if (ownerPlanResponse.statusCode === 200) {
                console.log('✅ Owner can retrieve their payment plan invoices\n');
            } else {
                console.log(`❌ Owner failed: ${ownerPlanResponse.statusCode}\n`);
            }
        }

        if (testInvoiceId > 0) {
            // Test 12: Get Invoice Summary (Admin)
            console.log('=== Test 12: Get Invoice Summary (Admin) ===');
            const summaryResponse = await makeRequest(
                'GET',
                `${API_BASE}/${testInvoiceId}/summary`,
                adminToken
            );
            if (summaryResponse.statusCode === 200) {
                const summary = summaryResponse.data.data;
                console.log('✅ Retrieved invoice summary');
                console.log(`   - Total: $${summary.amounts?.total || 0}`);
                console.log(`   - Paid: $${summary.amounts?.paid || 0}`);
                console.log(`   - Due: $${summary.amounts?.due || 0}\n`);
            } else {
                console.log(`❌ Failed to get summary: ${summaryResponse.statusCode}\n`);
            }

            // Test 13: Get Invoice Summary (Owner)
            console.log('=== Test 13: Get Invoice Summary (Owner) ===');
            const ownerSummaryResponse = await makeRequest(
                'GET',
                `${API_BASE}/${testInvoiceId}/summary`,
                studentToken
            );
            if (ownerSummaryResponse.statusCode === 200) {
                console.log('✅ Owner can access their invoice summary\n');
            } else {
                console.log(`❌ Owner failed to get summary: ${ownerSummaryResponse.statusCode}\n`);
            }

            // Test 14: Update Invoice Status (Admin)
            console.log('=== Test 14: Update Invoice Status (Admin) ===');
            const updateStatusResponse = await makeRequest(
                'PATCH',
                `${API_BASE}/${testInvoiceId}/status`,
                adminToken,
                { status: 'DUE' }
            );
            if (updateStatusResponse.statusCode === 200) {
                console.log('✅ Admin updated invoice status\n');
            } else {
                console.log(`❌ Failed to update status: ${updateStatusResponse.statusCode}\n`);
            }

            // Test 15: Update Invoice Status (Student - Should Fail)
            console.log('=== Test 15: Update Invoice Status (Student - Should Fail) ===');
            const studentUpdateResponse = await makeRequest(
                'PATCH',
                `${API_BASE}/${testInvoiceId}/status`,
                studentToken,
                { status: 'PAID' }
            );
            if (studentUpdateResponse.statusCode === 403) {
                console.log('✅ Correctly blocked student from updating status (403)\n');
            } else {
                console.log(`❌ Expected 403, got ${studentUpdateResponse.statusCode}\n`);
            }
        }

        // Test 16: Invalid Invoice ID
        console.log('=== Test 16: Invalid Invoice ID ===');
        const invalidIdResponse = await makeRequest('GET', `${API_BASE}/invalid`, adminToken);
        if (invalidIdResponse.statusCode === 400) {
            console.log('✅ Validation error for invalid ID (400)\n');
        } else {
            console.log(`❌ Expected 400, got ${invalidIdResponse.statusCode}\n`);
        }

        // Test 17: Non-existent Invoice
        console.log('=== Test 17: Non-existent Invoice ===');
        const notFoundResponse = await makeRequest('GET', `${API_BASE}/999999`, adminToken);
        if (notFoundResponse.statusCode === 404) {
            console.log('✅ Not found error for non-existent invoice (404)\n');
        } else {
            console.log(`❌ Expected 404, got ${notFoundResponse.statusCode}\n`);
        }

        // Test 18: Invalid Status Value
        if (testInvoiceId > 0) {
            console.log('=== Test 18: Invalid Status Value ===');
            const invalidStatusResponse = await makeRequest(
                'PATCH',
                `${API_BASE}/${testInvoiceId}/status`,
                adminToken,
                { status: 'INVALID_STATUS' }
            );
            if (invalidStatusResponse.statusCode === 400) {
                console.log('✅ Validation error for invalid status (400)\n');
            } else {
                console.log(`❌ Expected 400, got ${invalidStatusResponse.statusCode}\n`);
            }
        }

        // Test 19: Pagination with Filters
        console.log('=== Test 19: Pagination with Filters ===');
        const filteredResponse = await makeRequest(
            'GET',
            `${API_BASE}?page=1&limit=5&status=PAID&userId=${studentUserId}`,
            adminToken
        );
        if (filteredResponse.statusCode === 200) {
            console.log('✅ Pagination with filters working\n');
        } else {
            console.log(`❌ Filtered request failed: ${filteredResponse.statusCode}\n`);
        }

        // Test 20: Invalid Pagination Parameters
        console.log('=== Test 20: Invalid Pagination Parameters ===');
        const invalidPaginationResponse = await makeRequest(
            'GET',
            `${API_BASE}?page=0&limit=200`,
            adminToken
        );
        if (invalidPaginationResponse.statusCode === 400) {
            console.log('✅ Validation error for invalid pagination (400)\n');
        } else {
            console.log(`❌ Expected 400, got ${invalidPaginationResponse.statusCode}\n`);
        }

        // Test 21: Non-existent User for User Invoices
        console.log('=== Test 21: Non-existent User ===');
        const noUserResponse = await makeRequest('GET', `${API_BASE}/user/999999`, adminToken);
        if (noUserResponse.statusCode === 200) {
            // Returns empty array, not error - this is acceptable
            console.log('✅ Handled non-existent user gracefully\n');
        } else {
            console.log(`⚠️  Response: ${noUserResponse.statusCode}\n`);
        }

        // Test 22: Mark Invoice as Paid (Admin)
        if (testInvoiceId > 0) {
            console.log('=== Test 22: Mark Invoice as Paid (Admin) ===');
            // First, find an unpaid invoice or use current
            const markPaidResponse = await makeRequest(
                'POST',
                `${API_BASE}/${testInvoiceId}/mark-paid`,
                adminToken,
                { paymentMethod: 'cash', notes: 'Offline payment' }
            );
            if (markPaidResponse.statusCode === 200 || markPaidResponse.statusCode === 400) {
                // 400 if already paid is acceptable
                console.log('✅ Mark as paid endpoint working\n');
            } else {
                console.log(`❌ Failed to mark as paid: ${markPaidResponse.statusCode}\n`);
            }

            // Test 23: Mark as Paid (Student - Should Fail)
            console.log('=== Test 23: Mark as Paid (Student - Should Fail) ===');
            const studentMarkResponse = await makeRequest(
                'POST',
                `${API_BASE}/${testInvoiceId}/mark-paid`,
                studentToken
            );
            if (studentMarkResponse.statusCode === 403) {
                console.log('✅ Correctly blocked student from marking as paid (403)\n');
            } else {
                console.log(`❌ Expected 403, got ${studentMarkResponse.statusCode}\n`);
            }
        }

        console.log('=== All Tests Completed ===');
        console.log('✅ Invoice Controller tests executed successfully!');
        console.log('✅ All test scenarios completed');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        await pool.end();
        process.exit(1);
    }
}

// Run tests
runTests();
