const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// All admin routes need both auth (valid token) and adminAuth (role check)
router.use(auth);
router.use(adminAuth);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser); // New Endpoint
router.delete('/users/:userId', adminController.deleteUser);
router.get('/users/:userId', adminController.getUserDetails);

// API Key Management
router.get('/api-keys', adminController.getApiKeys);
router.post('/api-keys', adminController.addApiKey);
router.post('/api-keys/import', adminController.importApiKeys); // Import
router.put('/api-keys/:id', adminController.updateApiKey); // Update
router.put('/api-keys/:id/toggle', adminController.toggleApiKey);
router.delete('/api-keys/:id', adminController.deleteApiKey);

// Test API Key
router.post('/api-keys/test', adminController.testApiKey);
router.post('/api-keys/test-all', adminController.testAllApiKeys);
router.post('/api-keys/delete-batch', adminController.deleteBatchApiKeys);
router.post('/api-keys/activate-batch', adminController.activateBatchApiKeys);

router.get('/api-keys/stats', adminController.getKeyStats);

// System Config
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

// Server Logs
router.get('/logs', adminController.getServerLogs);
router.delete('/logs', adminController.clearServerLogs);

module.exports = router;
