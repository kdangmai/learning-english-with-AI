const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const folderController = require('../controllers/folderController');

// All routes protected
router.use(authMiddleware);

router.get('/', folderController.getFolders);
router.post('/', folderController.createFolder);
router.delete('/:folderId', folderController.deleteFolder);
router.post('/add-words', folderController.addWordsToFolder);

module.exports = router;
