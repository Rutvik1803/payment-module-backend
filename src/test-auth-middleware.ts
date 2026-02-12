import * as authService from './services/authService';

const testAuthMiddleware = async () => {
    try {
        console.log('🧪 Testing Auth Middleware...\n');

        // Get tokens for both admin and student
        console.log('1️⃣ Getting JWT tokens...');
        const adminLogin = await authService.login({
            email: 'admin@coursekey.com',
            password: 'admin123'
        });
        const adminToken = adminLogin.token;
        console.log(`✅ Admin token: ${adminToken.substring(0, 30)}...`);

        const studentLogin = await authService.login({
            email: 'john.doe@example.com',
            password: 'student123'
        });
        const studentToken = studentLogin.token;
        console.log(`✅ Student token: ${studentToken.substring(0, 30)}...\n`);

        // Test scenarios
        console.log('2️⃣ Test Scenarios:\n');

        console.log('📝 Scenario 1: No token provided');
        console.log('   curl http://localhost:3000/health/auth');
        console.log('   Expected: 401 Unauthorized - "No token provided"\n');

        console.log('📝 Scenario 2: Invalid token');
        console.log('   curl -H "Authorization: Bearer invalid.token" http://localhost:3000/health/auth');
        console.log('   Expected: 401 Unauthorized - "Invalid or expired token"\n');

        console.log('📝 Scenario 3: Valid admin token');
        console.log(`   curl -H "Authorization: Bearer ${adminToken.substring(0, 30)}..." http://localhost:3000/health/auth`);
        console.log('   Expected: 200 OK with user info\n');

        console.log('📝 Scenario 4: Valid student token');
        console.log(`   curl -H "Authorization: Bearer ${studentToken.substring(0, 30)}..." http://localhost:3000/health/auth`);
        console.log('   Expected: 200 OK with user info\n');

        console.log('📝 Scenario 5: Missing "Bearer" prefix');
        console.log('   curl -H "Authorization: SomeToken" http://localhost:3000/health/auth');
        console.log('   Expected: 401 Unauthorized - "No token provided"\n');

        console.log('\n3️⃣ Full tokens for manual testing:\n');
        console.log('Admin Token:');
        console.log(adminToken);
        console.log('\nStudent Token:');
        console.log(studentToken);

        console.log('\n\n4️⃣ Quick test commands:\n');
        console.log('Test with admin token:');
        console.log(`curl -H "Authorization: Bearer ${adminToken}" http://localhost:3000/health/auth\n`);

        console.log('Test with student token:');
        console.log(`curl -H "Authorization: Bearer ${studentToken}" http://localhost:3000/health/auth\n`);

        console.log('✅ Tokens generated successfully! Use the commands above to test the middleware.\n');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testAuthMiddleware();
