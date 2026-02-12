import * as UserModel from './models/User';
import bcrypt from 'bcrypt';
import { sanitizeUser, getUserFullName, isAdmin, isStudent } from './utils/userUtils';

const testUserModel = async () => {
    try {
        console.log('🧪 Testing User Model...\n');

        // Test: Create user
        console.log('1. Testing user creation...');
        const passwordHash = await bcrypt.hash('testpassword123', 10);
        const newUser = await UserModel.createUser({
            email: 'test-model@example.com',
            password_hash: passwordHash,
            first_name: 'Test',
            last_name: 'User',
            role: 'student',
        });
        console.log(`✅ User created with ID: ${newUser.id}\n`);

        // Test: Find by ID
        console.log('2. Testing find by ID...');
        const foundById = await UserModel.findUserById(newUser.id);
        if (foundById && foundById.email === 'test-model@example.com') {
            console.log(`✅ User found: ${foundById.email}\n`);
        } else {
            throw new Error('User not found by ID');
        }

        // Test: Find by email
        console.log('3. Testing find by email...');
        const foundByEmail = await UserModel.findUserByEmail('test-model@example.com');
        if (foundByEmail && foundByEmail.id === newUser.id) {
            console.log(`✅ User found by email: ID ${foundByEmail.id}\n`);
        } else {
            throw new Error('User not found by email');
        }

        // Test: Update user
        console.log('4. Testing update...');
        const updated = await UserModel.updateUser(newUser.id, {
            first_name: 'Updated',
            last_name: 'Name',
        });
        if (updated && updated.first_name === 'Updated') {
            console.log(`✅ User updated: ${updated.first_name} ${updated.last_name}\n`);
        } else {
            throw new Error('User update failed');
        }

        // Test: Email exists
        console.log('5. Testing email exists...');
        const exists = await UserModel.emailExists('test-model@example.com');
        console.log(`✅ Email exists check: ${exists}\n`);

        // Test: Find all users
        console.log('6. Testing find all users...');
        const allUsers = await UserModel.findAllUsers();
        console.log(`✅ Found ${allUsers.length} total users\n`);

        // Test: Find all students
        console.log('7. Testing find students...');
        const students = await UserModel.findAllUsers({ role: 'student' });
        console.log(`✅ Found ${students.length} students\n`);

        // Test: User utilities
        console.log('8. Testing user utilities...');
        const sanitized = sanitizeUser(newUser);
        console.log(`✅ Sanitized user (no password): ${!('password_hash' in sanitized)}`);
        console.log(`✅ Full name: ${getUserFullName(newUser)}`);
        console.log(`✅ Is admin: ${isAdmin(newUser)}`);
        console.log(`✅ Is student: ${isStudent(newUser)}\n`);

        // Test: Delete user
        console.log('9. Testing delete...');
        const deleted = await UserModel.deleteUser(newUser.id);
        if (deleted) {
            console.log(`✅ User deleted successfully\n`);
        } else {
            throw new Error('User deletion failed');
        }

        // Verify deletion
        const deletedUser = await UserModel.findUserById(newUser.id);
        if (!deletedUser) {
            console.log(`✅ Verified user no longer exists\n`);
        } else {
            throw new Error('User still exists after deletion');
        }

        console.log('🎉 All User Model tests passed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

testUserModel();
