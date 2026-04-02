const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const NodeCache = require('node-cache');
const appCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
let _configCache = null;
let _lastConfigFetch = 0;

/**
 * Service for interacting with AI providers (Gemini, OpenAI).
 * Handles API key management, failover, retries, and caching.
 */
// Default Models Mapping - Centralized Source of Truth
const DEFAULT_MODELS = {
  chatbot_model: 'gemini-2.5-flash-lite',
  translation_model: 'gemini-2.5-flash-lite',
  translation_eval_model: 'gemini-2.5-flash-lite',
  roleplay_chat_model: 'gemini-2.5-flash-lite',
  roleplay_report_model: 'gemini-2.5-pro',
  upgrade_model: 'gemini-2.5-pro',
  vocabulary_model: 'gemini-2.5-flash-lite',
  grammar_model: 'gemini-2.5-flash-lite',
  pronunciation_eval_model: 'gemini-2.5-flash-lite',
  pronunciation_gen_model: 'gemini-2.5-flash-lite'
};

// Available Models List - Single Source of Truth for Dropdowns
const AVAILABLE_MODELS = [
  // --- Gemini 3 (Newest Frontier) ---
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview - Newest Fast)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview - Most Intelligent)' },

  // --- Gemini 2.5 (Current Stable Standard) ---
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (RECOMMENDED - Speed)' },
  { value: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash Native Audio' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Advanced Reasoning)' },

  // --- Gemini 2.0 (Native Audio Support) ---
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Native Audio Support)' },
  { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking' },

  // --- Legacy / Specific Use ---
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Deprecating March 2026)' }
];

// OpenRouter Models - Available via OpenRouter API
const OPENROUTER_MODELS = [
  // --- Google Gemini via OpenRouter ---
  { value: 'google/gemini-2.5-flash', label: 'OR: Gemini 2.5 Flash' },
  { value: 'google/gemini-2.5-pro', label: 'OR: Gemini 2.5 Pro' },
  { value: 'google/gemini-2.5-flash-lite', label: 'OR: Gemini 2.5 Flash-Lite' },

  // --- OpenAI via OpenRouter ---
  { value: 'openai/gpt-4o', label: 'OR: GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'OR: GPT-4o Mini' },
  { value: 'openai/gpt-4.1-mini', label: 'OR: GPT-4.1 Mini' },
  { value: 'openai/gpt-4.1-nano', label: 'OR: GPT-4.1 Nano' },

  // --- Anthropic via OpenRouter ---
  { value: 'anthropic/claude-sonnet-4', label: 'OR: Claude Sonnet 4' },
  { value: 'anthropic/claude-3.5-haiku', label: 'OR: Claude 3.5 Haiku' },

  // --- Meta Llama via OpenRouter ---
  { value: 'meta-llama/llama-4-maverick', label: 'OR: Llama 4 Maverick' },
  { value: 'meta-llama/llama-4-scout', label: 'OR: Llama 4 Scout' },

  // --- DeepSeek via OpenRouter ---
  { value: 'deepseek/deepseek-chat-v3-0324', label: 'OR: DeepSeek V3' },
  { value: 'deepseek/deepseek-r1', label: 'OR: DeepSeek R1' },

  // --- Qwen via OpenRouter ---
  { value: 'qwen/qwen3-235b-a22b', label: 'OR: Qwen3 235B' },
  { value: 'qwen/qwen3-30b-a3b', label: 'OR: Qwen3 30B' },
];

class ChatbotService {

  static get DEFAULT_MODELS() { return DEFAULT_MODELS; }
  static get AVAILABLE_MODELS() { return AVAILABLE_MODELS; }
  static get OPENROUTER_MODELS() { return OPENROUTER_MODELS; }

  /**
   * Helper: Get Config for a feature
   */
  static async getConfig(featureKey, defaultModel = null) {
    // If no default provided, look up in transparent DEFAULT_MODELS map
    if (!defaultModel) {
      defaultModel = DEFAULT_MODELS[featureKey] || 'gemini-2.5-flash-lite';
    }
    const now = Date.now();
    // Refresh config cache every 5 minutes or if null
    if (!_configCache || (now - _lastConfigFetch > 300000)) {
      try {
        const SystemSetting = require('../models/SystemSetting');
        const settings = await SystemSetting.find();
        _configCache = {};
        settings.forEach(s => {
          _configCache[s.key] = s.value;
        });
        _lastConfigFetch = now;
      } catch (e) {
        console.error('Failed to load system config:', e);
        // Dont clear cache if fetch fails, just use old or empty
        if (!_configCache) _configCache = {};
      }
    }

    const val = _configCache[featureKey] || defaultModel;
    console.log(`[ChatbotService] getConfig(${featureKey}) => ${val} (Default was: ${defaultModel})`);
    return val;
  }

  static clearConfigCache() {
    _configCache = null;
  }

  /**
   * Generic Retry Wrapper
   */
  static async performWithRetry(operationFn, retries = 2, operationName = 'Operation') {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await operationFn();
      } catch (error) {
        lastError = error;
        if (i < retries) {
          console.warn(`[ChatbotService] ${operationName} failed (Attempt ${i + 1}/${retries + 1}). Retrying... Error: ${error.message}`);
        }
      }
    }
    throw lastError;
  }

  /**
   * Send message to the configured Chatbot API (Gemini or OpenAI).
   * 
   * Strategy:
   * 1. If preferredModel is passed, use it.
   * 2. Else, use the DB stored model for the specific key (legacy) OR allow overriding?
   *    Actually, we now want to ignore the Key's model and use the System Config model.
   * 
   * @param {string} message - The user prompt
   * @param {string} context - System prompt or context
   * @param {string|null} preferredModel - Logic: If 'null', use default key model? No, providing a model here is an override.
   * @returns {Promise<string>} The text response from AI
   */
  // --- Key Management State ---
  static _keyStats = {}; // { key: { uses: 0, failures: 0, lastUsed: 0 } }
  static _userStats = {}; // { userId: { requests: 0, successes: 0, failures: 0, lastActive: 0 } }
  static _cooldowns = {}; // { key: timestamp_when_available }
  static _roundRobinIndex = 0;

  static getKeyStats() {
    return this._keyStats;
  }

  static async getUserStats() {
    try {
      const UserUsage = mongoose.models.UserUsage || require('../models/UserUsage');
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const stats = await UserUsage.find({ month: monthStr });

      const map = {};
      stats.forEach(s => {
        if (s.userId) {
          map[s.userId] = {
            requests: s.totalRequests,
            successes: s.successRequests,
            failures: s.failedRequests,
            features: s.features,
            lastActive: s.lastActive
          };
        }
      });
      return map;
    } catch (e) {
      console.error('[ChatbotService] Error fetching user stats:', e);
      return {};
    }
  }

  /**
   * Helper: Record success for a key
   */
  static _recordSuccess(key) {
    if (!this._keyStats[key]) this._keyStats[key] = { uses: 0, failures: 0, lastUsed: 0 };
    this._keyStats[key].uses++;
    this._keyStats[key].lastUsed = Date.now();
  }

  /**
   * Helper: Record usage for a user
   */
  static async _recordUserUsage(userId, isSuccess, feature = 'general') {
    if (!userId) return;

    // In-memory update (legacy/fast access backup)
    if (!this._userStats[userId]) {
      this._userStats[userId] = { requests: 0, successes: 0, failures: 0, lastActive: 0 };
    }
    this._userStats[userId].requests++;
    this._userStats[userId].lastActive = Date.now();
    if (isSuccess) this._userStats[userId].successes++;
    else this._userStats[userId].failures++;

    // DB Update (Persistent)
    try {
      const UserUsage = mongoose.models.UserUsage || require('../models/UserUsage');
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const update = {
        $inc: {
          totalRequests: 1,
          successRequests: isSuccess ? 1 : 0,
          failedRequests: isSuccess ? 0 : 1,
          [`features.${feature}`]: 1
        },
        $set: { lastActive: now }
      };

      await UserUsage.findOneAndUpdate(
        { userId, month: monthStr },
        update,
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.error('[ChatbotService] Failed to record user usage to DB:', dbErr);
    }
  }

  /**
   * Helper: Record failure for a key
   */
  static _recordFailure(key, isRateLimit = false) {
    if (!this._keyStats[key]) this._keyStats[key] = { uses: 0, failures: 0, lastUsed: 0 };
    this._keyStats[key].failures++;
    this._keyStats[key].lastUsed = Date.now();

    if (isRateLimit) {
      // Smart Cooldown: 60 seconds
      this._cooldowns[key] = Date.now() + 60000;
      console.warn(`[ChatbotService] ⏳ Key ending in ...${key.slice(-4)} put on COOLDOWN for 60s due to Rate Limit.`);
    }
  }

  /**
   * Send message to the configured Chatbot API (Gemini or OpenAI).
   * Implements: Round Robin, Smart Cooldown, and Fallback.
   */
  static async sendToChatbot(message, context = '', preferredModel = null, audioData = null, userId = null, feature = 'general', timeoutMs = 30000) {
    // Detect if the preferredModel is an OpenRouter model (format: provider/model-name)
    const isOpenRouterModel = preferredModel && preferredModel.includes('/');

    // 1. Get all available keys
    let keys = [];
    try {
      const ApiKey = mongoose.models.ApiKey || require('../models/ApiKey');
      const dbKeys = await ApiKey.find({ isActive: true });
      if (dbKeys.length > 0) {
        keys = dbKeys.map(k => ({
          key: k.key,
          model: preferredModel || k.model || 'gemini-2.5-flash',
          name: k.name,
          provider: k.provider || 'gemini'
        }));
      }
    } catch (e) {
      console.error('[ChatbotService] Failed to fetch DB keys:', e);
    }

    // If the model is an OpenRouter model, filter to only use OpenRouter keys
    if (isOpenRouterModel) {
      const orKeys = keys.filter(k => k.provider === 'openrouter');
      if (orKeys.length > 0) {
        keys = orKeys;
      } else {
        console.warn('[ChatbotService] OpenRouter model requested but no OpenRouter keys available. Falling back to all keys with Gemini model.');
        // Fallback: reset model to gemini default
        keys = keys.map(k => ({ ...k, model: k.provider === 'gemini' ? 'gemini-2.5-flash-lite' : k.model }));
      }
    } else {
      // For non-OpenRouter models, prefer matching provider keys
      const geminiKeys = keys.filter(k => k.provider === 'gemini');
      const otherKeys = keys.filter(k => k.provider !== 'gemini' && k.provider !== 'openrouter');
      if (geminiKeys.length > 0) {
        keys = [...geminiKeys, ...otherKeys];
      }
    }

    if (keys.length === 0) throw new Error('No API keys available.');

    // 2. Filter out Cooldowns
    const now = Date.now();
    let availableKeys = keys.filter(k => {
      const availableAt = this._cooldowns[k.key] || 0;
      return now >= availableAt;
    });

    if (availableKeys.length === 0) {
      console.warn("[ChatbotService] All keys are in cooldown! Forced to try cooldown keys anyway (desperation mode).");
      availableKeys = keys; // Fallback to all if everyone is timed out
    }

    // 3. Apply Rotation / Strategy (Round Robin + Least Used override if needed)
    // Simple Round Robin shift
    // We want to rotate the STARTING point of our loop based on _roundRobinIndex
    const startIndex = this._roundRobinIndex % availableKeys.length;
    const rotatedKeys = [
      ...availableKeys.slice(startIndex),
      ...availableKeys.slice(0, startIndex)
    ];

    // Increment global index for next call
    this._roundRobinIndex++;

    console.log(`[ChatbotService] Processing with ${rotatedKeys.length} keys (Strategy: Round Robin Fallback/Racing).`);

    let lastError = null;

    const tryKey = async (currentKey) => {
      const { key, model, name, provider } = currentKey;

      if (!this._keyStats[key]) this._keyStats[key] = { uses: 0, failures: 0, lastUsed: 0 };
      console.log(`[ChatbotService] Trying key "${name}" (${provider}, ${model}) [Uses: ${this._keyStats[key].uses}]...`);

      try {
        let resultText = '';

        if (provider === 'openai' || provider === 'openrouter') {
          if (audioData) throw new Error(`${provider} provider does not support direct audio input in this service.`);

          const payload = {
            model: model,
            messages: [
              ...(context ? [{ role: 'system', content: context }] : []),
              { role: 'user', content: message }
            ]
          };

          const apiUrl = provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

          const headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          };

          if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://learn-english-ai.app';
            headers['X-OpenRouter-Title'] = 'Learn English With AI';
          }

          const response = await axios.post(
            apiUrl,
            payload,
            { headers, timeout: timeoutMs }
          );
          resultText = response.data?.choices?.[0]?.message?.content;
        } else {
          // Gemini Default
          const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const parts = [];
          if (context) {
            parts.push({ text: `Context: ${context}\n` });
          }
          if (message) {
            parts.push({ text: message });
          }

          if (audioData) {
            parts.push({
              inline_data: {
                mime_type: audioData.mimeType || 'audio/webm',
                data: audioData.data
              }
            });
          }

          const response = await axios.post(
            `${API_URL}?key=${key}`,
            { contents: [{ parts }] },
            { timeout: timeoutMs }
          );
          resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (resultText) {
          console.log(`[ChatbotService] Key "${name}" succeeded.`);
          this._recordSuccess(key);
          return resultText;
        } else {
          console.warn(`[ChatbotService] Key "${name}" returned no content.`);
          throw new Error("No content returned");
        }

      } catch (error) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || error.message;

        console.error(`[ChatbotService] Key "${name}" (${provider}) failed. Status: ${status}. Message: ${errorMessage}`);

        if (status === 429) {
          this._recordFailure(key, true);
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          this._cooldowns[key] = Date.now() + 120000;
          console.warn(`[ChatbotService] ⏳ Key "...${key.slice(-4)}" on COOLDOWN 120s (timeout).`);
          this._recordFailure(key, false);
        } else {
          this._recordFailure(key, false);
        }
        
        throw new Error(errorMessage);
      }
    };

    while (rotatedKeys.length > 0) {
      // Race 2 keys simultaneously to reduce wait time
      const raceBatch = rotatedKeys.splice(0, 2);
      const racePromises = raceBatch.map(k => tryKey(k));
      
      try {
        const result = await Promise.any(racePromises);
        await this._recordUserUsage(userId, true, feature);
        return result;
      } catch (aggregateError) {
        lastError = aggregateError.errors ? aggregateError.errors[0] : aggregateError;
      }
    }

    await this._recordUserUsage(userId, false, feature); // Record user failure if all keys failed
    throw new Error(`All active API keys failed. Last error: ${lastError?.message || lastError}`);
  }

  static async testKey(key, model = 'gemini-2.5-flash', provider = 'gemini') {
    try {
      let content = '';
      if (provider === 'gemini') {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await axios.post(
          `${API_URL}?key=${key}`,
          { contents: [{ parts: [{ text: "Hello" }] }] },
          { timeout: 10000 }
        );
        content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      } else if (provider === 'openai' || provider === 'openrouter') {
        const apiUrl = provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

        const testModel = provider === 'openrouter'
          ? (model || 'google/gemini-2.5-flash-lite')
          : (model || 'gpt-4o-mini');

        const headers = { 'Authorization': `Bearer ${key}` };
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://learn-english-ai.app';
          headers['X-OpenRouter-Title'] = 'Learn English With AI';
        }

        const response = await axios.post(
          apiUrl,
          {
            model: testModel,
            messages: [{ role: 'user', content: "Hello" }],
            max_tokens: 5
          },
          { headers, timeout: 15000 }
        );
        content = response.data?.choices?.[0]?.message?.content;
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error("API responded but returned no content.");
      }

      return { success: true, message: `Valid ${provider.toUpperCase()} API Key (Content received)` };
    } catch (error) {
      const status = error.response?.status;
      console.error("Test Key Failed:", error.response?.data || error.message);

      // Auto-deactivate logic for Rate Limits during Test
      if (status === 429) {
        console.warn(`[ChatbotService] 🚫 Auto-deactivating tested key due to Rate Limit (429).`);
        try {
          const ApiKeyModel = mongoose.models.ApiKey || require('../models/ApiKey');
          await ApiKeyModel.updateOne({ key: key }, { isActive: false });
          return {
            success: false,
            keyDeactivated: true,
            message: "Rate Limit Exceeded. Key has been AUTO-DEACTIVATED."
          };
        } catch (dbErr) {
          console.error("Failed to auto-deactivate key during test:", dbErr);
        }
      }

      return {
        success: false,
        message: error.response?.data?.error?.message || error.message || "Unknown error"
      };
    }
  }

  // --- Feature Methods ---

  static async translateVietnamseToEnglish(vietnameseSentence, userId = null) {
    // New Key: translation_model
    const model = await this.getConfig('translation_model');
    const prompt = `Translate this Vietnamese sentence to English. Provide only the translation, nothing else:\n"${vietnameseSentence}"`;

    try {
      return await this.sendToChatbot(prompt, '', model, null, userId, 'translation');
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  static async getSentenceHints(vietnameseSentence, difficulty, userId = null) {
    const cacheKey = `hints_${difficulty}_${vietnameseSentence.trim()}`;
    const cached = appCache.get(cacheKey);
    if (cached) return cached;

    // Key: vocabulary_model (Keep for hints/vocab)
    const model = await this.getConfig('vocabulary_model');

    const operation = async () => {
      let prompt;
      const normalizedDiff = difficulty.toUpperCase();
      const headers = "Output text format per line:\nVOCAB: [word] - [Vietnamese meaning]\nGRAMMAR: [Specific Structure Formula/Pattern for this sentence]";

      // User requested: "phần từ vựng thì có cấu trúc [từ tiếng anh] - [nghĩa tiếng việt]"
      // So we switch back to Vietnamese meanings for Vocab.

      if (['A1', 'A2', 'EASY'].includes(normalizedDiff) || difficulty === 'easy') {
        prompt = `For Vietnamese sentence: "${vietnameseSentence}"
          Provide simple hints (A1-A2).
          1. Key Vocabulary (Format: English word - Vietnamese meaning).
          2. Specific grammar structure needed for THIS sentence (e.g. if Question, show Question pattern).
          Example: "Can + Subject + Verb...?" (for questions)
          ${headers}
          No markdown.`;
      } else if (['B1', 'B2', 'MEDIUM'].includes(normalizedDiff) || difficulty === 'medium') {
        prompt = `For Vietnamese sentence: "${vietnameseSentence}"
          Provide intermediate hints (B1-B2).
          1. Key Vocabulary (English word - Vietnamese meaning).
          2. Specific grammar structure (Pattern Name or Formula). concise.
          ${headers}
          No markdown.`;
      } else {
        prompt = `For Vietnamese sentence: "${vietnameseSentence}"
          Provide advanced hints (C1-C2).
          1. Synonyms/Idioms (English word - Vietnamese meaning).
          2. Advanced structure required.
          ${headers}
          No markdown.`;
      }

      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'hints');
      const hints = { vocabularyHints: [], grammarStructures: [] };
      const lines = response.split('\n');

      for (const line of lines) {
        if (line.startsWith('VOCAB:')) {
          hints.vocabularyHints.push(line.replace('VOCAB:', '').trim());
        } else if (line.startsWith('GRAMMAR:')) {
          hints.grammarStructures.push(line.replace('GRAMMAR:', '').trim());
        }
      }
      return hints;
    };

    try {
      const result = await this.performWithRetry(operation, 1, 'getSentenceHints');
      appCache.set(cacheKey, result);
      return result;
    } catch {
      return { vocabularyHints: [], grammarStructures: [] };
    }
  }

  static async upgradeSentence(userSentence, grammarLevel = 'C1', vocabularyLevel = 'C1', userId = null) {
    const cacheKey = `upgrade_${grammarLevel}_${vocabularyLevel}_${userSentence.trim()}`;
    const cached = appCache.get(cacheKey);
    if (cached) return cached;

    // Key: upgrade_model
    const model = await this.getConfig('upgrade_model');

    const operation = async () => {
      const prompt = `Upgrade this English sentence to Grammar=${grammarLevel}, Vocab=${vocabularyLevel}.
        Original: "${userSentence}"
        Output TEXT ONLY (No JSON, No Markdown). Format:
        UPGRADED: [The full new sentence]
        ---
        ORIGINAL: [substring from old]
        IMPROVED: [substring in new]
        EXPLAIN: [Reason]
        ---`;

      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'upgrade');

      const blocks = response.split('---').map(b => b.trim()).filter(b => b);
      const result = { upgradedSentence: "", improvements: [] };

      if (blocks.length > 0) {
        result.upgradedSentence = blocks[0].replace('UPGRADED:', '').trim();
      }

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const getVal = (key) => {
          const m = block.match(new RegExp(`${key}:\\s*(.*)`, 'i'));
          return m ? m[1].trim() : '';
        };

        const original = getVal('ORIGINAL');
        const improved = getVal('IMPROVED');
        const explanation = getVal('EXPLAIN');

        if (original || improved) {
          result.improvements.push({ original, improved, explanation });
        }
      }

      if (!result.upgradedSentence) throw new Error("Parsed empty result for upgrade");
      return result;
    };

    try {
      const result = await this.performWithRetry(operation, 1, 'upgradeSentence');
      appCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Upgrade error:', error);
      throw error;
    }
  }

  static async generateGrammarExercises(tenseName, count = 15, userId = null) {
    const cacheKey = `exercises_${tenseName}_${count}`;
    const cached = appCache.get(cacheKey);
    if (cached) return cached;

    // Key: grammar_model
    const model = await this.getConfig('grammar_model');

    const operation = async () => {
      const prompt = `Bạn là chuyên gia ngữ pháp tiếng Anh. Hãy tạo ${count} bài tập về thì "${tenseName}" gồm 5 loại: 'mcq' (trắc nghiệm), 'fill' (điền từ), 'find_error' (tìm lỗi sai), 'reorder' (sắp xếp từ), 'rewrite' (viết lại câu sao cho nghĩa không đổi).
        
        QUAN TRỌNG: Trả về định dạng TEXT thuần (không markdown cầu kỳ), các bài tập cách nhau bởi "---".
        Cấu trúc MỖI bài tập phải CHÍNH XÁC như sau:
        
        TYPE: [mcq | fill | find_error | reorder | rewrite]
        QUESTION: [Nội dung câu hỏi]
        OPTIONS: [A | B | C | D (mcq) HOẶC chừa trống (fill/find_error/rewrite) HOẶC list từ (reorder)]
        ANSWER: [Đáp án đúng]
        EXPLAIN: [Giải thích ngắn gọn]
        ---
        
        YÊU CẦU CỤ THỂ CHO TỪNG LOẠI:
        
        1. MCQ:
        TYPE: mcq
        QUESTION: She ___ to school.
        OPTIONS: go | goes | going | went
        ANSWER: goes
        EXPLAIN: She là ngôi 3 số ít.

        2. Filling:
        TYPE: fill
        QUESTION: He [________] (play) football well.
        OPTIONS:
        ANSWER: plays
        EXPLAIN: Hiện tại đơn.

        3. Find Error (QUAN TRỌNG: Dùng dấu | để tách các phần. Dấu chấm câu nên dính liền với từ trước nó trừ khi chính nó là lỗi sai):
        TYPE: find_error
        QUESTION: She | plays | tennis | on | Sunday | yesterday.
        OPTIONS:
        ANSWER: yesterday
        EXPLAIN: "plays" là thì hiện tại, không dùng "yesterday".
        (Lưu ý: Nếu lỗi sai là dấu chấm, hãy để riêng: She | plays | tennis | . | yesterday)

        4. Reorder (Sắp xếp từ - QUAN TRỌNG: Giữ nguyên viết hoa/thường của từ đầu câu trong list OPTIONS):
        TYPE: reorder
        QUESTION: Sắp xếp câu sau:
        OPTIONS: She | plays | tennis | every | day
        ANSWER: She plays tennis every day
        EXPLAIN: Cấu trúc S + V + O.

        5. Rewrite (Viết lại câu):
        TYPE: rewrite
        QUESTION: I started learning English 5 years ago. (Dùng Present Perfect)
        OPTIONS:
        ANSWER: I have learned English for 5 years
        EXPLAIN: Chuyển từ Past Simple sang Present Perfect.
        ---`;

      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'grammar_exercise');

      const exercises = [];
      const blocks = response.split('---').map(b => b.trim()).filter(b => b);

      for (const block of blocks) {
        const getLine = (prefix) => {
          const regex = new RegExp(`(?:\\*\\*|#|\\s|-\\s)*${prefix}(?:\\*\\*)?\\s*:?\\s*(.*)`, 'i');
          const match = block.match(regex);
          return match ? match[1].trim() : null;
        };

        let type = getLine('TYPE');
        // Fallback detection...
        if (!type) {
          if (block.includes('Multiple Choice')) type = 'mcq';
          else if (block.includes('Fill')) type = 'fill';
          else if (block.includes('Find Error') || block.includes('Tìm Lỗi')) type = 'find_error';
          else if (block.includes('Reorder') || block.includes('Sắp Xếp')) type = 'reorder';
          else if (block.includes('Rewrite') || block.includes('Viết Lại')) type = 'rewrite';
        }

        let question = getLine('QUESTION') || getLine('Câu hỏi');
        if (!question && block.split('\n').length > 1) {
          question = block.split('\n').find(l => !l.match(/^(TYPE|OPTIONS|ANSWER|EXPLAIN|---)/i));
        }

        const optionsRaw = getLine('OPTIONS') || getLine('Các lựa chọn');
        const answer = getLine('ANSWER') || getLine('Đáp án');
        const explanation = getLine('EXPLAIN') || getLine('Giải thích');

        if (!type || !question) continue;

        type = type.toLowerCase();
        if (type.includes('mcq')) type = 'mcq';
        else if (type.includes('fill')) type = 'fill';
        else if (type.includes('error')) type = 'find_error';
        else if (type.includes('reorder')) type = 'reorder';
        else if (type.includes('rewrite')) type = 'rewrite';

        const exercise = { type, question, correctAnswer: answer, explanation };

        if (type === 'mcq') {
          const opts = optionsRaw ? optionsRaw.split('|').map(o => o.trim()) : [];
          if (opts.length >= 4) {
            exercise.options = { "A": opts[0], "B": opts[1], "C": opts[2], "D": opts[3] };
            let key = Object.keys(exercise.options).find(k => exercise.options[k] === answer);
            // If answer is "A" or "B" directly
            if (!key && ["A", "B", "C", "D"].includes(answer)) key = answer;
            // Fallback
            exercise.correctAnswer = key || "A";
          } else continue;
        } else if (type === 'reorder') {
          // Robust parsing for reorder
          let words = [];
          if (optionsRaw) {
            if (optionsRaw.includes('|')) words = optionsRaw.split('|').map(w => w.trim());
            else if (optionsRaw.includes(',')) words = optionsRaw.split(',').map(w => w.trim());
            else words = optionsRaw.split(/\s+/); // Fallback to spaces
          }

          exercise.words = words.filter(w => w); // Remove empty

          // If no options provided, try to shuffle the answer
          if (exercise.words.length === 0 && answer) {
            exercise.words = answer.split(' ').sort(() => Math.random() - 0.5);
          }
        } else if (type === 'find_error') {
          // Handle pipe delimiter or ** wrapping
          if (question.includes('|')) {
            // Convert | separated parts to **wrapped** for frontend
            const raw = question.replace(/\*\*/g, '');
            // Logic change: Don't just wrap everything. Only wrap parts that are separated.
            // If there's content like "word ." -> "word" and "." are distinct.
            exercise.question = raw.split('|').filter(s => s.trim()).map(s => `**${s.trim()}**`).join(' ');
          } else if (question.includes('**')) {
            exercise.question = question;
          } else {
            // Fallback: split by space
            exercise.question = question.split(' ').map(w => `**${w}**`).join(' ');
          }
          exercise.options = {};
        } else if (type === 'rewrite') {
          // Rewrite type usually has no options, just input
          exercise.options = {};
        }

        exercises.push(exercise);
      }
      if (exercises.length === 0) {
        console.error('[ChatbotService] Parsed 0 exercises. Raw response:', response);
        throw new Error("Parsed 0 exercises");
      }
      return exercises;
    };

    try {
      const exercises = await this.performWithRetry(operation, 1, 'generateGrammarExercises');
      appCache.set(cacheKey, exercises);
      return exercises;
    } catch (error) {
      console.error('Generate exercises error:', error);
      throw error;
    }
  }

  static async evaluateTranslation(vietnameseSentence, userEnglishSentence, grammarDifficulty = 'General', userId = null) {
    // New Key: translation_eval_model
    const model = await this.getConfig('translation_eval_model');
    const prompt = `Act as an English teacher evaluating a translation from Vietnamese to English.
    Vietnamese: "${vietnameseSentence}"
    User English: "${userEnglishSentence}"
    Target Grammar Level: ${grammarDifficulty} (Evaluate strictness based on this level)

    Task:
    1. Score from 0 to 100 based on Accuracy, Grammar, and Vocabulary.
    2. Provide feedback in Vietnamese, but keep English terms in English.
    3. Provide a better version if necessary (Native ${grammarDifficulty} level).
    4. List specific corrections.
    
    Output Format (text only, no markdown):
    SCORE: [number 0-100]
    FEEDBACK: [Vietnamese text, concise]
    BETTER: [English text or NONE]
    CORRECTION: [Explanation of error and fix]
    CORRECTION: ...`;

    try {
      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'translation_eval');
      const result = { score: 0, feedback: "", corrections: [], betterVersion: null };

      console.log("[ChatbotService] Translate Eval Raw:", response);
      const lines = response.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();

        // Regex for flexible parsing
        const scoreMatch = trimmed.match(/^(?:\*\*|#|-|\s)*SCORE\s*:?\s*(\d+)/i);
        const feedbackMatch = trimmed.match(/^(?:\*\*|#|-|\s)*FEEDBACK\s*:?\s*(.*)/i);
        const betterMatch = trimmed.match(/^(?:\*\*|#|-|\s)*BETTER\s*:?\s*(.*)/i);
        const correctionMatch = trimmed.match(/^(?:\*\*|#|-|\s)*CORRECTION\s*:?\s*(.*)/i);

        if (scoreMatch) {
          result.score = parseInt(scoreMatch[1], 10);
        } else if (feedbackMatch) {
          result.feedback = feedbackMatch[1].trim();
        } else if (betterMatch) {
          const val = betterMatch[1].trim();
          if (val && val !== 'NONE') result.betterVersion = val;
        } else if (correctionMatch) {
          result.corrections.push(correctionMatch[1].trim());
        }
      }
      return result;
    } catch (error) {
      console.error('Evaluation error:', error);
      return { score: 0, feedback: "Error", corrections: [], betterVersion: null };
    }
  }

  static async analyzePronunciation(targetSentence, input, isAudio = false, userId = null) {
    // New Key: pronunciation_eval_model
    const model = await this.getConfig('pronunciation_eval_model');

    // If input is audio base64, we need native audio model if available, or just use the config model (assuming it supports audio like 1.5-flash or 2.0-flash)
    // Map the placeholder 'gemini-2.5-flash-native' to a real working Native Audio model (currently gemini-2.0-flash-exp)
    // If user selected generic "gemini-2.5-flash-native", use 2.0-flash-exp.
    // If user selected explicit preview string, use 2.5-flash.
    const effectiveModel = isAudio
      ? (model === 'gemini-2.5-flash-native' || model === 'gemini-2.5-flash-native-audio-preview-12-2025' || model === 'gemini-2.0-flash-exp' ? 'gemini-2.5-flash' : model)
      : (model === 'gemini-2.5-flash-native' || model === 'gemini-2.5-flash-native-audio-preview-12-2025' || model === 'gemini-2.0-flash-exp' ? 'gemini-2.5-flash' : model);

    let prompt;
    let response;

    if (isAudio) {
      prompt = `Bạn là giáo viên tiếng Anh chuyên về phát âm. Phân tích file âm thanh người học gửi lên và đưa ra nhận xét chi tiết bằng tiếng Việt, phù hợp cho người Việt Nam học tiếng Anh.

Câu người học vừa đọc: "${targetSentence}"

Mục tiêu: giúp họ phát âm rõ ràng, dễ hiểu. Phản hồi ngắn gọn, dễ hiểu, không dùng thuật ngữ ngôn ngữ học phức tạp. Luôn khích lệ nhẹ nhàng, không chê bai.

Định dạng đầu ra (text thuần, KHÔNG dùng markdown, KHÔNG dùng ** hay #):
TRANSCRIPT: [ghi lại chính xác những gì nghe được, phiên âm IPA nếu cần]
SCORE: [số 0-100, 90+ = gần như bản ngữ]
OVERVIEW: [2-3 câu nhận xét chung, ví dụ: "Phát âm nhìn chung dễ nghe, tốc độ vừa phải, nhưng còn một số âm chưa rõ."]
MISTAKES: [Liệt kê 3-5 lỗi phát âm quan trọng nhất. Mỗi lỗi gồm: tên lỗi, ví dụ cụ thể trong câu, và cách sửa rất đơn giản (vị trí lưỡi, môi, hơi thở). Chú ý các lỗi phổ biến của người Việt: không phát âm /s/ cuối từ, nhầm /θ/ với /t/, nhầm /ð/ với /d/, nhầm /ɪ/ với /iː/, trọng âm sai, ngữ điệu đều.]
PRACTICE: [Chọn 3-7 từ/cụm trong câu người học vừa đọc mà dễ phát âm sai. Mỗi từ ghi phiên âm IPA + hướng dẫn cách đọc bằng tiếng Việt đơn giản. Nếu có lỗi trọng âm, ghi rõ chỗ nhấn.]
HOMEWORK: [1-3 bài tập ngắn dựa trên lỗi cụ thể của người học, ví dụ: "Đọc từ X 10 lần", "Tự ghi âm lại câu Y, chú ý âm Z"]`;

      try {
        response = await this._sendMultimodalToChatbot(prompt, input, effectiveModel, userId, 'pronunciation_eval_audio');
      } catch (e) {
        console.error("Audio analysis failed, falling back to text (if possible) or error", e);
        throw e;
      }
    } else {
      // Text based analysis (legacy)
      const spokenSentence = input;
      prompt = `Bạn là giáo viên tiếng Anh chuyên về phát âm. Phân tích bài phát âm dựa trên văn bản đã nhận diện.

Câu mẫu: "${targetSentence}"
Câu người học đọc (nhận diện): "${spokenSentence}"

Định dạng đầu ra (text thuần, KHÔNG markdown):
SCORE: [số 0-100]
OVERVIEW: [2-3 câu nhận xét chung bằng tiếng Việt]
MISTAKES: [3-5 lỗi quan trọng, mỗi lỗi có ví dụ + cách sửa đơn giản]
PRACTICE: [3-7 từ/cụm nên luyện thêm + hướng dẫn đọc]
HOMEWORK: [1-3 bài tập ngắn]`;

      response = await this.sendToChatbot(prompt, '', effectiveModel, null, userId, 'pronunciation_eval_text');
    }

    try {
      const result = { score: 0, transcript: "", overview: "", mistakes: "", practice: "", homework: "" };

      console.log("[ChatbotService] Pronunciation Raw:", response);
      const lines = response.split('\n');
      let currentSection = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const transcriptMatch = trimmed.match(/^(?:\*\*|#|-|\s)*TRANSCRIPT\s*:?\s*(.*)/i);
        const scoreMatch = trimmed.match(/^(?:\*\*|#|-|\s)*SCORE\s*:?\s*(\d+)/i);
        const overviewMatch = trimmed.match(/^(?:\*\*|#|-|\s)*OVERVIEW\s*:?\s*(.*)/i);
        const mistakesMatch = trimmed.match(/^(?:\*\*|#|-|\s)*MISTAKES\s*:?\s*(.*)/i);
        const practiceMatch = trimmed.match(/^(?:\*\*|#|-|\s)*PRACTICE\s*:?\s*(.*)/i);
        const homeworkMatch = trimmed.match(/^(?:\*\*|#|-|\s)*HOMEWORK\s*:?\s*(.*)/i);

        if (transcriptMatch) {
          result.transcript = transcriptMatch[1].trim();
          currentSection = null;
        } else if (scoreMatch) {
          result.score = parseInt(scoreMatch[1], 10);
          currentSection = null;
        } else if (overviewMatch) {
          result.overview = overviewMatch[1].trim();
          currentSection = 'overview';
        } else if (mistakesMatch) {
          result.mistakes = mistakesMatch[1].trim();
          currentSection = 'mistakes';
        } else if (practiceMatch) {
          result.practice = practiceMatch[1].trim();
          currentSection = 'practice';
        } else if (homeworkMatch) {
          result.homework = homeworkMatch[1].trim();
          currentSection = 'homework';
        } else if (currentSection) {
          result[currentSection] += '\n' + trimmed;
        }
      }

      // Backward compat: keep feedback field as overview for controller response
      result.feedback = result.overview;
      return result;
    } catch (error) {
      console.error('Pronunciation parsing error', error);
      throw error;
    }
  }

  // Helper for Multimodal (Audio)
  static async _sendMultimodalToChatbot(text, audioData, model, userId = null, feature = 'pronunciation_multimodal') {
    // 1. Get a key (Simple selection for now, assume Gemini)dToChatbot logic concepts)
    let keys = [];
    try {
      const ApiKey = mongoose.models.ApiKey || require('../models/ApiKey');
      const dbKeys = await ApiKey.find({ isActive: true });
      if (dbKeys.length > 0) keys = dbKeys;
    } catch (e) {
      console.error('Failed keys fetch', e);
    }
    if (keys.length === 0) throw new Error('No API keys for audio analysis');

    // 2. Filter Cooldowns
    const now = Date.now();
    let availableKeys = keys.filter(k => (this._cooldowns[k.key] || 0) <= now);
    if (availableKeys.length === 0) availableKeys = keys;

    // 3. Round Robin
    const startIndex = this._roundRobinIndex % availableKeys.length;
    const rotatedKeys = [...availableKeys.slice(startIndex), ...availableKeys.slice(0, startIndex)];
    this._roundRobinIndex++;

    // 4. Loop
    let lastError;
    for (const kStat of rotatedKeys) {
      const { key, name, provider } = kStat;
      // Force Gemini for audio (OpenAI not supported here yet in this snippet)
      if (provider !== 'gemini' && !kStat.key.startsWith('AIza')) continue;

      try {
        // Try v1 API which is stable for 1.5-flash
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        console.log(`[ChatbotService] Sending audio to: ${API_URL}`);

        const payload = {
          contents: [{
            parts: [
              { text: text },
              { inline_data: { mime_type: audioData.mimeType || "audio/webm", data: audioData.data } } // Using webm as likely format from browser
            ]
          }]
        };

        const response = await axios.post(
          `${API_URL}?key=${key}`,
          payload,
          { timeout: 60000 } // Long timeout for audio upload/process
        );

        const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) {
          this._recordSuccess(key);
          await this._recordUserUsage(userId, true, feature);
          return resultText;
        } else {
          throw new Error("Empty response from native audio model");
        }
      } catch (error) {
        lastError = error;
        const errorDetail = error.response?.data?.error?.message || error.message;
        console.error(`Key ${name} failed audio analysis (404/Error): ${errorDetail}`);

        const status = error.response?.status;
        if (status === 429) this._recordFailure(key, true);
        else this._recordFailure(key, false);
      }
    }
    throw new Error(`Audio analysis failed. Last error: ${lastError?.message}`);
  }
  static async generateRoleplayResponse(scenario, role, history, userMessage, audioData = null, userId = null) {
    // New Key: roleplay_chat_model
    const model = await this.getConfig('roleplay_chat_model');

    // Construct conversation history string
    // If audioData is present, userMessage might be empty or a placeholder.
    // We should rely on the model listening to the audio for the current turn.
    const historyText = history.map(m => `${m.role === 'user' ? 'User' : role}: ${m.content}`).join('\n');

    const context = `You are roleplaying as a "${role}" in a "${scenario}" scenario. 
    Your goal is to have a natural conversation with the user to help them practice English.
    - Stay in character at all times.
    - Keep responses concise and natural (1-3 sentences typically).
    - Correct crucial misunderstanding only if necessary for the flow, otherwise just chat.
    - Do not give feedback yet, just roleplay.
    ${audioData ? '- The user has sent an AUDIO message. Listen to it and respond naturally.' : ''}
    
    Previous conversation:
    ${historyText}`;

    try {
      const response = await this.sendToChatbot(userMessage, context, model, audioData, userId, 'roleplay_chat');
      return response;
    } catch (error) {
      console.error('Roleplay response error:', error);
      throw error;
    }
  }

  static async generateRoleplayReport(scenario, role, history, userId = null) {
    // New Key: roleplay_report_model
    const model = await this.getConfig('roleplay_report_model'); // Use Pro for better analysis

    // Clearly separate User vs AI lines
    const historyText = history.map(m => {
      if (m.role === 'user') return `[USER]: ${m.content}`;
      return `[AI - ${role}]: ${m.content}`;
    }).join('\n');

    const prompt = `You are an English language evaluator. Analyze the following roleplay conversation and provide feedback ONLY on the USER's English.

Scenario: ${scenario}
AI Role: ${role}

Conversation:
${historyText}

CRITICAL RULES:
- ONLY evaluate lines marked [USER]. These are the English learner's responses.
- COMPLETELY IGNORE lines marked [AI - ${role}]. Those are generated by the AI and must NOT be evaluated.
- All grammar_errors and vocabulary_suggestions must reference text from [USER] lines ONLY.
- ALL feedback text (explanation, context, overall_comment) MUST be written in Vietnamese (tiếng Việt) so the learner can understand easily.
- The "original" and "correction" fields should keep the English text as-is, but "explanation" must be in Vietnamese.

Task: Provide a feedback report in JSON format:
1. "naturalness": score 0-10 (how natural the USER's dialogue sounds).
2. "grammar_errors": array of objects { "original": "exact English text from USER's message", "correction": "corrected English version", "explanation": "giải thích bằng tiếng Việt" }. ONLY from [USER] lines.
3. "vocabulary_suggestions": array of objects { "original": "English word/phrase from USER's message", "better_word": "improved English alternative", "context": "lý do bằng tiếng Việt" }. ONLY from [USER] lines.
4. "overall_comment": nhận xét tổng quan bằng tiếng Việt về khả năng tiếng Anh của người dùng trong cuộc hội thoại này.

Output JSON ONLY.`;

    try {
      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'roleplay_report');
      // Attempt to extract JSON if wrapped in markdown
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Roleplay report error:', error);
      // Fallback object
      return {
        naturalness: 0,
        grammar_errors: [],
        vocabulary_suggestions: [],
        overall_comment: "Could not generate report due to an error."
      };
    }
  }
  static async generatePracticeSentence(level, userId = null) {
    const prompt = `Generate a random English sentence for pronunciation practice.
      Level: ${level} (A1, A2, B1, B2, C1, or C2).
      
      Requirements:
      1. The sentence should be natural and grammatically correct.
      2. Fit the selected CEFR level complexity.
      3. Length: 8-15 words.
      
      Output: ONLY the English sentence. No markdown, no quotes, no extra text.`;

    try {
      // Use pronunciation generation model or default
      const model = await this.getConfig('pronunciation_gen_model');
      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'practice_sentence');
      return response.trim().replace(/^"|"$/g, '');
    } catch (error) {
      console.error('Generate sentence error:', error);
      // Fallbacks
      const fallbacks = {
        'A1': "I like to eat apples and bananas.",
        'B1': "The weather today is perfect for a picnic in the park.",
        'C1': "Sustainability is crucial for the long-term well-being of our planet."
      };
      return fallbacks[level] || fallbacks['A1'];
    }
  }

  static async analyseReadingVocab(passage, targetBand, userLevel, userId = null) {
    const model = await this.getConfig('vocabulary_model');

    const prompt = `You are an expert IELTS Reading Vocabulary Coach. Analyze the following reading passage and extract high-value vocabulary words.

Passage to analyze:
"${passage}"

Target IELTS Band: ${targetBand}
User's Current Level: ${userLevel}

CRITICAL RULES:
- Identify exactly 5 to 12 words that are ESSENTIAL for the user to learn to reach their Target Band, considering their Current Level.
- Prioritize Academic Word List (AWL) words and vocabulary frequently tested in IELTS Reading (e.g., words often paraphrased in questions).
- "essentialReason" MUST be explained in Vietnamese. (e.g., "Từ vựng AWL, thường xuất hiện trong IELTS Reading band 7.0").
- "memoryHook" MUST be written in Vietnamese. Provide a clever, memorable way to remember the word (mnemonic, word root, or vivid image).
- Output MUST be a valid JSON array of objects, with NO surrounding markdown or extra text.

JSON Array Output Format:
[
  {
    "word": "unprecedented",
    "phonetic": "/ʌnˈpresɪdentɪd/",
    "partOfSpeech": "adjective",
    "definition": "never having happened or existed in the past",
    "synonyms": ["unparalleled", "groundbreaking", "novel"],
    "exampleSentence": "The proliferation of digital technology led to unprecedented changes in education.",
    "essentialReason": "Từ vựng AWL cấp độ C1, rất hay dùng để miêu tả sự thay đổi lớn.",
    "memoryHook": "Tiền tố 'un-' (không) + root 'precede' (đi trước). Hãy tưởng tượng một kỷ lục mới chưa từng có ai đạt được trước đó."
  }
]

ONLY output the JSON array.`;

    try {
      const response = await this.sendToChatbot(prompt, '', model, null, userId, 'reading_vocab');
      // Attempt to extract JSON if wrapped in markdown
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Reading vocab analysis error:', error);
      throw error;
    }
  }
}

module.exports = ChatbotService;
