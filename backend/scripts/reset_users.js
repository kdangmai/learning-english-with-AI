const mongoose = require('mongoose');
const User = require('../src/models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resetUsers = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing in .env");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Delete all users
        await User.deleteMany({});
        console.log('All existing users have been deleted.');

        // Create Admin
        const admin = new User({
            username: 'admin',
            email: 'admin@example.com',
            password: '123123az', // Hashed by pre-save
            role: 'admin',
            fullName: 'Administrator',
            isEmailVerified: true
        });
        await admin.save();
        console.log('User "admin" created successfully.');

        // Create User1
        const user1 = new User({
            username: 'user1',
            email: 'user1@example.com',
            password: '123123az', // Hashed by pre-save
            role: 'user',
            fullName: 'Standard User',
            isEmailVerified: true
        });
        await user1.save();
        console.log('User "user1" created successfully.');

    } catch (error) {
        console.error('Error resetting users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB.');
        process.exit();
    }
};

resetUsers();
