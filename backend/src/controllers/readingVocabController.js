const ChatbotService = require('../services/chatbotService');
const Vocabulary = require('../models/Vocabulary');

// Analyzes the text and extracts IELTS vocabulary using AI
exports.analyzeReadingVocab = async (req, res) => {
  try {
    const { passage, targetBand, userLevel } = req.body;
    const userId = req.userId;

    if (!passage || !targetBand || !userLevel) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const words = await ChatbotService.analyseReadingVocab(passage, targetBand, userLevel, userId);
    
    res.json(words);
  } catch (error) {
    console.error('Error analyzing reading vocabulary:', error);
    res.status(500).json({ message: error.message || 'Failed to analyze passage' });
  }
};

// Saves selected words to the user's Vocabulary collection
exports.saveReadingWords = async (req, res) => {
  try {
    const userId = req.userId;
    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ message: 'Invalid words array provided' });
    }

    const savedWords = [];
    const errors = [];

    for (const wordData of words) {
      try {
        // Check if word already exists for this user in reading vocab
        const existing = await Vocabulary.findOne({ 
          userId, 
          word: wordData.word.toLowerCase(),
          topic: 'ielts-reading'
        });

        if (existing) {
          // If exists, maybe update the meaning or just skip
          continue; 
        }

        const newVocab = new Vocabulary({
          userId,
          word: wordData.word.toLowerCase(),
          pronunciation: wordData.phonetic,
          meaning: {
            vi: wordData.definition, // Using definition as vi meaning or we could do en meaning
            en: wordData.definition
          },
          partOfSpeech: wordData.partOfSpeech.toLowerCase(),
          example: wordData.exampleSentence,
          topic: 'ielts-reading',
          level: 'Mixed', // Since they come from different bands
          isNewWord: true, // Mark as new for review
          // Save extra specific fields in the meaning or as a workaround
          // Since we reuse the schema, we'll prefix synonyms and memory hooks to the VI meaning for UI rendering
          // Or just save as they are since Model allows it if we added mixed schema? No, meaning vi/en is string.
        });

        // We can format meaning.vi to contain the extra data as JSON string for now to avoid schema changes
        const extraData = {
          definition: wordData.definition,
          synonyms: wordData.synonyms,
          essentialReason: wordData.essentialReason,
          memoryHook: wordData.memoryHook
        };
        newVocab.meaning.vi = JSON.stringify(extraData);

        await newVocab.save();
        savedWords.push(newVocab);
      } catch (err) {
        console.error(`Error saving word ${wordData.word}:`, err);
        errors.push({ word: wordData.word, error: err.message });
      }
    }

    res.json({ 
      message: `Successfully saved ${savedWords.length} words`, 
      savedCount: savedWords.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving reading vocabulary:', error);
    res.status(500).json({ message: 'Server error while saving words' });
  }
};

// Gets words saved strictly from reading vocab to review
exports.getReadingVocabList = async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query; // optional filter

    // Use existing schema
    const query = { userId, topic: 'ielts-reading' };
    
    if (status) {
      query['mastery.status'] = status;
    }

    const words = await Vocabulary.find(query).sort({ createdAt: -1 });
    
    // Parse the extra data back out for the frontend
    const formattedWords = words.map(doc => {
      const obj = doc.toObject();
      try {
        if (obj.meaning && obj.meaning.vi && obj.meaning.vi.startsWith('{')) {
          const extra = JSON.parse(obj.meaning.vi);
          obj.definition = extra.definition;
          obj.synonyms = extra.synonyms;
          obj.essentialReason = extra.essentialReason;
          obj.memoryHook = extra.memoryHook;
        }
      } catch (e) {
        // Fallback
        obj.definition = obj.meaning?.vi;
      }
      return obj;
    });

    res.json(formattedWords);
  } catch (error) {
    console.error('Error getting reading vocabulary list:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Gets words due for SRS review
exports.getReviewWords = async (req, res) => {
  try {
     const userId = req.userId;
     
     const now = new Date();
     const query = {
       userId,
       topic: 'ielts-reading',
       $or: [
         { 'srs.dueDate': { $lte: now } }, // Due for review
         { isNewWord: true } // Or never reviewed before
       ]
     };

     const dueWords = await Vocabulary.find(query).limit(50); // limit batch size

     const formattedWords = dueWords.map(doc => {
      const obj = doc.toObject();
      try {
        if (obj.meaning && obj.meaning.vi && obj.meaning.vi.startsWith('{')) {
          const extra = JSON.parse(obj.meaning.vi);
          obj.definition = extra.definition;
          obj.synonyms = extra.synonyms;
          obj.essentialReason = extra.essentialReason;
          obj.memoryHook = extra.memoryHook;
        }
      } catch (e) {
        obj.definition = obj.meaning?.vi;
      }
      return obj;
    });

     res.json(formattedWords);
  } catch (error) {
    console.error('Error getting due words:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
