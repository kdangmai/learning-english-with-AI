require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/database');

const createAdmin = async () => {
    try {
        await connectDB();

        const adminData = {
            username: 'admin',
            email: 'admin@learnenglish.ai',
            password: 'admin123',
            fullName: 'Super Administrator',
            role: 'admin',
            isEmailVerified: true,
            currentLevel: 'expert'
        };

        let user = await User.findOne({ $or: [{ username: adminData.username }, { email: adminData.email }] });

        if (user) {
            console.log('Admin user found. Updating privileges (Password NOT changed)...');
            // Only update fields that are not password
            user.role = 'admin';
            user.isEmailVerified = true;
            await user.save();
        } else {
            console.log('Creating new admin user...');
            user = new User(adminData);
            await user.save();
        }

        console.log('================================================');
        console.log('✅ ADMIN USER CREATED SUCCESSFULLY');
        console.log('================================================');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('================================================');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
