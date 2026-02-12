const User = require('../models/User');
const Sentence = require('../models/Sentence');
const ApiKey = require('../models/ApiKey');
const SystemSetting = require('../models/SystemSetting');
const Vocabulary = require('../models/Vocabulary');
const Grammar = require('../models/Grammar');
const ChatSession = require('../models/ChatSession');
const Folder = require('../models/Folder');


// --- User Management ---

/**
 * Get all users from the database.
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

/**
 * Create a new user (Admin function).
 * Auto-verifies email.
 * @route POST /api/admin/users
 */
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role, fullName } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
        }

        // Check duplicates
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
        }

        const newUser = new User({
            username,
            email,
            password, // Hook will hash this
            role: role || 'user',
            fullName: fullName || '',
            isEmailVerified: true // Auto-verify for admin created users
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                isEmailVerified: newUser.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
};

/**
 * Update user details (Admin function).
 * @route PUT /api/admin/users/:userId
 */
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, role, fullName, password } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check duplicates if changing email/username
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
            user.email = email;
        }

        if (username && username !== user.username) {
            const exists = await User.findOne({ username });
            if (exists) return res.status(400).json({ success: false, message: 'Username already in use' });
            user.username = username;
        }

        if (role) user.role = role;
        if (fullName !== undefined) user.fullName = fullName;

        // Update password if provided
        if (password && password.trim().length > 0) {
            user.password = password; // Pre-save hook will hash this
        }

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Fetch stats
        const sentenceCount = await Sentence.countDocuments({ userId });

        // You can add more stats from other models like Vocabulary, GrammarProgress, etc.
        const stats = {
            sentenceCount
        };

        res.json({ success: true, user, stats });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user details' });
    }
};

/**
 * Delete a user and all their data (Admin function).
 * @route DELETE /api/admin/users/:userId
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deleting admin accounts
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Cannot delete admin accounts' });
        }

        // Cascade delete all user data
        await Promise.all([
            Vocabulary.deleteMany({ userId }),
            Grammar.deleteMany({ userId }),
            Sentence.deleteMany({ userId }),
            ChatSession.deleteMany({ userId }),
            Folder.deleteMany({ userId }),
        ]);

        await User.findByIdAndDelete(userId);

        res.json({ success: true, message: `User "${user.username}" and all related data deleted successfully` });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};

// --- API Key Management ---

/**
 * Get all configured API keys (masked).
 * @route GET /api/admin/api-keys
 */
exports.getApiKeys = async (req, res) => {
    try {
        const keys = await ApiKey.find().sort({ createdAt: -1 });
        // Mask the keys for security, show only last 4 chars
        const maskedKeys = keys.map(k => ({
            _id: k._id,
            name: k.name,
            isActive: k.isActive,
            model: k.model,
            provider: k.provider,
            createdAt: k.createdAt,
            keyMasked: `...${k.key.slice(-4)}`
        }));

        res.json({ success: true, keys: maskedKeys, fullKeys: keys }); // Sending full keys for now as admin might need to copy/verify, or we can just send masked. Let's send full for simplicity in this MVP but be careful.
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch API keys' });
    }
};

exports.addApiKey = async (req, res) => {
    try {
        const { key, name } = req.body;
        if (!key) {
            return res.status(400).json({ success: false, message: 'API Key is required' });
        }

        const newKey = new ApiKey({
            key,
            name: name || 'Untitled Key',
            model: 'gemini-2.5-flash', // Default as UI no longer sends this
            provider: 'gemini' // Default as user request
        });

        await newKey.save();
        res.json({ success: true, message: 'API Key added', key: newKey });
    } catch (error) {
        console.error('Add API key error:', error);
        res.status(500).json({ success: false, message: 'Failed to add API key' });
    }
};

exports.updateApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, key, model, provider } = req.body;

        const apiKey = await ApiKey.findById(id);
        if (!apiKey) return res.status(404).json({ success: false, message: 'Key not found' });

        if (name) apiKey.name = name;
        if (key) apiKey.key = key;
        if (model) apiKey.model = model;
        if (provider) apiKey.provider = provider;

        await apiKey.save();
        res.json({ success: true, message: 'API Key updated', key: apiKey });
    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ success: false, message: 'Failed to update API key' });
    }
};

exports.importApiKeys = async (req, res) => {
    try {
        const { keys } = req.body; // Array of { name, key }
        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({ success: false, message: 'No keys provided' });
        }

        let added = 0;
        let errors = 0;

        for (const k of keys) {
            if (!k.key) { errors++; continue; }
            // Check existence
            const exists = await ApiKey.findOne({ key: k.key });
            if (exists) { errors++; continue; }

            await new ApiKey({
                name: k.name || 'Imported Key',
                key: k.key,
                model: 'gemini-2.5-flash',
                provider: 'gemini'
            }).save();
            added++;
        }

        res.json({ success: true, message: `Imported ${added} keys. ${errors} skipped (duplicates/invalid).` });
    } catch (error) {
        console.error('Import API keys error:', error);
        res.status(500).json({ success: false, message: 'Failed to import keys' });
    }
};

exports.toggleApiKey = async (req, res) => {
    try {
        const { id } = req.params;

        const key = await ApiKey.findById(id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        key.isActive = !key.isActive;
        await key.save();

        res.json({ success: true, message: `API Key ${key.isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error('Toggle API key error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle API key' });
    }
};

exports.deleteApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        await ApiKey.findByIdAndDelete(id);
        res.json({ success: true, message: 'API Key deleted' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete API key' });
    }
};

exports.testApiKey = async (req, res) => {
    try {
        const { key, model, provider } = req.body;
        if (!key) return res.status(400).json({ success: false, message: "Missing API Key" });

        // We need ChatbotService here, require it dynamically or at top
        const ChatbotService = require('../services/chatbotService');

        const result = await ChatbotService.testKey(key, model, provider);

        res.json(result);
    } catch (error) {
        console.error('Test API Key error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Test ALL API Keys in database.
 * Auto-activates valid ones, deactivates invalid ones.
 * @route POST /api/admin/api-keys/test-all
 */
exports.testAllApiKeys = async (req, res) => {
    try {
        const keys = await ApiKey.find();
        const ChatbotService = require('../services/chatbotService');

        const results = {
            total: keys.length,
            success: 0,
            failed: 0,
            details: []
        };

        for (const keyDoc of keys) {
            // Test the key
            const testResult = await ChatbotService.testKey(keyDoc.key, keyDoc.model || 'gemini-2.5-flash', keyDoc.provider || 'gemini');

            // Update status based on test result
            if (testResult.success) {
                keyDoc.isActive = true;
                results.success++;
            } else {
                keyDoc.isActive = false;
                results.failed++;
            }
            await keyDoc.save();

            results.details.push({
                name: keyDoc.name,
                success: testResult.success,
                message: testResult.message
            });

            // Add delay to avoid rate limits (1 second between tests)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Test ALL keys error:', error);
        res.status(500).json({ success: false, message: 'Failed to batch test keys' });
    }
};

/**
 * Delete multiple API keys by ID.
 * @route POST /api/admin/api-keys/delete-batch
 */
exports.deleteBatchApiKeys = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        const result = await ApiKey.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, message: `Deleted ${result.deletedCount} keys.` });
    } catch (error) {
        console.error('Batch delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to data batch delete' });
    }
};

/**
 * Activate multiple API keys by ID.
 * @route POST /api/admin/api-keys/activate-batch
 */
exports.activateBatchApiKeys = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        // Set isActive = true for all matching IDs
        const result = await ApiKey.updateMany(
            { _id: { $in: ids } },
            { $set: { isActive: true } }
        );

        res.json({ success: true, message: `Activated ${result.modifiedCount} keys.` });
    } catch (error) {
        console.error('Batch activate error:', error);
        res.status(500).json({ success: false, message: 'Failed to batch activate' });
    }
};

// --- System Configuration ---

/**
 * Get all system settings (feature -> model mapping).
 * @route GET /api/admin/config
 */
exports.getSystemConfig = async (req, res) => {
    try {
        const settings = await SystemSetting.find();
        const config = {};
        settings.forEach(s => {
            config[s.key] = s.value;
        });

        const ChatbotService = require('../services/chatbotService');

        // Use the Centralized Defaults from Service
        const defaults = ChatbotService.DEFAULT_MODELS;

        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            config: { ...defaults, ...config },
            models: ChatbotService.AVAILABLE_MODELS
        });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch config' });
    }
};

/**
 * Update a system setting.
 * @route PUT /api/admin/config
 */
exports.updateSystemConfig = async (req, res) => {
    try {
        const { key, value } = req.body;
        console.log(`[Admin] Updating config: ${key} -> ${value}`);

        if (!key || !value) {
            return res.status(400).json({ success: false, message: 'Key and Value required' });
        }

        const updated = await SystemSetting.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('[Admin] DB Updated:', updated);

        // Invalidate cache if needed, or rely on TTL
        const ChatbotService = require('../services/chatbotService');
        if (ChatbotService.clearConfigCache) {
            ChatbotService.clearConfigCache();
            console.log('[Admin] Config cache cleared');
        }

        res.json({ success: true, message: 'Config updated' });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ success: false, message: 'Failed to update config' });
    }
};

/**
 * Get API Key Usage Stats for Monitoring.
 * @route GET /api/admin/api-keys/stats
 */
exports.getKeyStats = async (req, res) => {
    try {
        const ChatbotService = require('../services/chatbotService');
        const stats = ChatbotService.getKeyStats();
        const cooldowns = ChatbotService._cooldowns || {};

        res.json({
            success: true,
            stats,
            cooldowns,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get key stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch key stats' });
    }
};
