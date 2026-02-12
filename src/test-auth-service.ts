import * as authService from './services/authService';
import * as UserModel from './models/User';

const testAuthService = async () => {
    try {
        console.log('🧪 Testing Auth Service...\n');

        // Test 1: User Registration
        console.log('1. Testing user registration...');
        const registerData = {
            email: 'testauth@example.com',
            password: 'TestPass123',
            first_name: 'Auth',
            last_name: 'Tester',
            role: 'student' as const,
        };

        const registerResult = await authService.register(registerData);
        console.log(`✅ User registered: ${registerResult.user.email}`);
        console.log(`✅ Token generated: ${registerResult.token.substring(0, 20)}...\n`);

        // Test 2: User Login
        console.log('2. Testing user login...');
        const loginResult = await authService.login({
            email: 'testauth@example.com',
            password: 'TestPass123',
        });
        console.log(`✅ User logged in: ${loginResult.user.email}`);
        console.log(`✅ Token: ${loginResult.token.substring(0, 20)}...\n`);

        // Test 3: Token Verification
        console.log('3. Testing token verification...');
        const decoded = authService.verifyToken(loginResult.token);
        console.log(`✅ Token verified, userId: ${decoded.userId}, email: ${decoded.email}, role: ${decoded.role}\n`);

        // Test 4: Get User by Token
        console.log('4. Testing get user by token...');
        const userFromToken = await authService.getUserByToken(loginResult.token);
        console.log(`✅ User retrieved: ${userFromToken.email}\n`);

        // Test 5: Invalid Login (Wrong Password)
        console.log('5. Testing invalid login (wrong password)...');
        try {
            await authService.login({
                email: 'testauth@example.com',
                password: 'WrongPassword123',
            });
            console.log('❌ Should have thrown error for wrong password\n');
        } catch (error: any) {
            console.log(`✅ Invalid credentials caught: ${error.message}\n`);
        }

        // Test 6: Duplicate Email
        console.log('6. Testing duplicate email registration...');
        try {
            await authService.register(registerData);
            console.log('❌ Should have thrown error for duplicate email\n');
        } catch (error: any) {
            console.log(`✅ Duplicate email caught: ${error.message}\n`);
        }

        // Test 7: Invalid Email Format
        console.log('7. Testing invalid email format...');
        try {
            await authService.register({
                ...registerData,
                email: 'invalid-email',
            });
            console.log('❌ Should have thrown error for invalid email\n');
        } catch (error: any) {
            console.log(`✅ Invalid email caught: ${error.message}\n`);
        }

        // Test 8: Weak Password
        console.log('8. Testing weak password...');
        try {
            await authService.register({
                ...registerData,
                email: 'weak@example.com',
                password: 'weak',
            });
            console.log('❌ Should have thrown error for weak password\n');
        } catch (error: any) {
            console.log(`✅ Weak password caught: ${error.message}\n`);
        }

        // Test 9: Change Password
        console.log('9. Testing change password...');
        await authService.changePassword(
            registerResult.user.id,
            'TestPass123',
            'NewPass456'
        );
        console.log('✅ Password changed successfully\n');

        // Test 10: Login with New Password
        console.log('10. Testing login with new password...');
        const newLoginResult = await authService.login({
            email: 'testauth@example.com',
            password: 'NewPass456',
        });
        console.log(`✅ Logged in with new password: ${newLoginResult.user.email}\n`);

        // Test 11: Invalid Token
        console.log('11. Testing invalid token...');
        try {
            authService.verifyToken('invalid.token.here');
            console.log('❌ Should have thrown error for invalid token\n');
        } catch (error: any) {
            console.log(`✅ Invalid token caught: ${error.message}\n`);
        }

        // Clean up: Delete test user
        console.log('12. Cleaning up test user...');
        await UserModel.deleteUser(registerResult.user.id);
        console.log('✅ Test user deleted\n');

        console.log('🎉 All Auth Service tests passed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

testAuthService();
