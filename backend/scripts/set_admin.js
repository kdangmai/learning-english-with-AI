const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

const setAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find user 'admin'
        const user = await User.findOne({ username: 'admin' });
        if (user) {
            user.role = 'admin';
            await user.save();
            console.log('User "admin" is now an ADMIN.');
        } else {
            console.log('User "admin" not found. Creating one...');
            const newUser = new User({
                username: 'admin',
                email: 'admin@example.com',
                password: 'adminpassword', // Will be hashed by pre-save
                role: 'admin',
                fullName: 'System Administrator'
            });
            await newUser.save();
            console.log('Created user "admin" with password "adminpassword".');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

setAdmin();
