const User = require('../models/User');

/**
 * Admin Authentication Middleware
 * Checks if user is authenticated AND has admin role
 */
const adminMiddleware = async (req, res, next) => {
    try {
        // req.userId is set by the auth middleware
        if (!req.userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
        }

        // Attach full user object for convenience if needed
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin Middleware Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = adminMiddleware;
