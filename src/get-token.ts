import * as authService from './services/authService';

const getToken = async () => {
    try {
        const result = await authService.login({
            email: 'admin@coursekey.com',
            password: 'admin123'
        });
        console.log('\n🔑 JWT Token:');
        console.log(result.token);
        console.log('\n📋 Copy this token and test with:');
        console.log(`curl -H "Authorization: Bearer ${result.token}" http://localhost:3000/health/auth\n`);
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

getToken();
