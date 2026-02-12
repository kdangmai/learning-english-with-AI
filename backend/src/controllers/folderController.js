const Folder = require('../models/Folder');
const Vocabulary = require('../models/Vocabulary');

/**
 * Create a new folder
 */
exports.createFolder = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.userId;

        if (!name) return res.status(400).json({ success: false, message: 'Folder name is required' });

        const existing = await Folder.findOne({ userId, name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Folder already exists' });
        }

        const folder = new Folder({ userId, name });
        await folder.save();

        res.json({ success: true, folder });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all folders
 */
exports.getFolders = async (req, res) => {
    try {
        const userId = req.userId;
        const folders = await Folder.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, folders });
    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a folder
 */
exports.deleteFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const userId = req.userId;

        await Folder.findOneAndDelete({ _id: folderId, userId });

        // Unlink words from this folder
        await Vocabulary.updateMany({ userId, folderId }, { $set: { folderId: null } });

        res.json({ success: true, message: 'Folder deleted' });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add words to folder
 */
exports.addWordsToFolder = async (req, res) => {
    try {
        const { folderId, wordIds } = req.body;
        const userId = req.userId;

        if (!wordIds || !Array.isArray(wordIds)) {
            return res.status(400).json({ success: false, message: 'Invalid word IDs' });
        }

        const updateData = { folderId: folderId || null }; // If null, remove from folder

        await Vocabulary.updateMany(
            { _id: { $in: wordIds }, userId },
            { $set: updateData }
        );

        res.json({ success: true, message: 'Words moved successfully' });
    } catch (error) {
        console.error('Move words error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
