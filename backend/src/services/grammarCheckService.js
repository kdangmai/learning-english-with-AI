const axios = require('axios');
require('dotenv').config();

class GrammarCheckService {
  /**
   * Check grammar and vocabulary using LanguageTool API
   */
  static async checkGrammar(sentence) {
    try {
      const response = await axios.post(
        'https://api.languagetoolplus.com/v2/check',
        new URLSearchParams({
          text: sentence,
          language: 'en-US'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const matches = response.data.matches || [];
      const errors = matches.map(match => ({
        type: match.rule.category,
        message: match.message,
        offset: match.offset,
        length: match.length,
        suggestion: match.replacements?.[0]?.value || ''
      }));

      return {
        errors,
        isCorrect: errors.length === 0,
        errorCount: errors.length
      };
    } catch (error) {
      console.error('Grammar check error:', error);
      throw new Error('Failed to check grammar', { cause: error });
    }
  }

  /**
   * Score sentence based on grammar and vocabulary
   */
  static async scoreSentence(userSentence, referenceSentence) {
    try {
      const grammarCheck = await this.checkGrammar(userSentence);

      // Calculate scores (simplified)
      const grammarScore = Math.max(0, 100 - (grammarCheck.errorCount * 10));

      // Vocabulary score based on similarity to reference (simplified)
      const vocabularyScore = this.calculateSimilarity(userSentence, referenceSentence) * 100;

      const overallScore = Math.round((grammarScore + vocabularyScore) / 2);

      return {
        overallScore: Math.min(100, overallScore),
        grammarScore: Math.min(100, grammarScore),
        vocabularyScore: Math.min(100, vocabularyScore),
        errors: grammarCheck.errors,
        suggestions: grammarCheck.errors.map(err => err.suggestion).filter(s => s)
      };
    } catch (error) {
      console.error('Scoring error:', error);
      throw error;
    }
  }

  /**
   * Simple similarity calculation between sentences
   */
  static calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const matches = words1.filter(word => words2.includes(word)).length;
    const maxLength = Math.max(words1.length, words2.length);

    return maxLength > 0 ? matches / maxLength : 0;
  }
}

module.exports = GrammarCheckService;
