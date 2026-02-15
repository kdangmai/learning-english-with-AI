import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30s timeout to prevent hanging requests
});

// Add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Request deduplication removed to prevent false positive CanceledErrors
// React StrictMode or rapid navigation can trigger legitimate parallel requests.


// Auth endpoints
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  verifyOTP: (email, otpCode) => apiClient.post('/auth/verify-otp', { email, otpCode }),
  resendOTP: (email) => apiClient.post('/auth/resend-otp', { email }),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email) => apiClient.post('/auth/resend-verification', { email }),
  logout: () => apiClient.post('/auth/logout')
};

// User endpoints
export const userAPI = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  getStatistics: () => apiClient.get('/users/statistics'),
  updatePreferences: (data) => apiClient.put('/users/preferences', data)
};

// Grammar endpoints
export const grammarAPI = {
  getTenses: () => apiClient.get('/grammar/tenses'),
  getTenseDetails: (tenseName) => apiClient.get(`/grammar/tenses/${tenseName}`),
  getProgress: () => apiClient.get('/grammar/progress'),
  submitExercise: (data) => apiClient.post('/grammar/exercise', data),
  completeTense: (tenseName) => apiClient.post('/grammar/complete-tense', { tenseName }),
  generateExercises: (tenseName) => apiClient.post('/grammar/generate-exercises', { tenseName })
};

// Vocabulary endpoints
export const vocabularyAPI = {
  // Vocabulary endpoints
  getTopics: () => apiClient.get('/vocabulary/topics'),
  getWordsByTopic: (topic) => apiClient.get(`/vocabulary/by-topic/${topic}`),
  getWordsByStatus: (status) => apiClient.get(`/vocabulary/by-status/${status}`),
  addWord: (data) => apiClient.post('/vocabulary/add', data),
  updateWord: (wordId, data) => apiClient.put(`/vocabulary/${wordId}`, data),
  reviewWord: (data) => apiClient.post('/vocabulary/srs-review', data),

  // Flashcards & SRS
  getFlashcards: (params) => apiClient.get('/vocabulary/flashcards', { params }), // supports ?limit=20
  generateFlashcards: (topic) => apiClient.post('/vocabulary/generate-flashcards', { topic }),
  getSRSStats: () => apiClient.get('/vocabulary/srs-stats'),
  // Removed incorrect getSRSReview GET endpoint
  getIntervals: (wordId) => apiClient.get(`/vocabulary/intervals/${wordId}`),

  // Learning & Games
  startLearning: (wordIds) => apiClient.post('/vocabulary/start-learning', { wordIds }),
  matchGame: (count) => apiClient.get(`/vocabulary/match-game?count=${count}`),

  // Actions
  applyAction: (wordId, body) => apiClient.post(`/vocabulary/${wordId}/action`, body),
  bulkDelete: (wordIds) => apiClient.post('/vocabulary/bulk-delete', { wordIds }),
  deleteWord: (wordId) => apiClient.delete(`/vocabulary/${wordId}`),
  bulkAddWords: (data) => apiClient.post('/vocabulary/bulk-add', data) // Assuming endpoint exists or mapped to add
};

// Sentence endpoints
export const sentenceAPI = {
  submitSentence: (data) => apiClient.post('/sentences/submit', data),
  gradeSentence: (data) => apiClient.post('/sentences/grade', data),
  upgradeSentence: (data) => apiClient.post('/sentences/upgrade', data),
  getHistory: () => apiClient.get('/sentences/history'),
  getSentence: (sentenceId) => apiClient.get(`/sentences/${sentenceId}`),
  getHints: (data) => apiClient.post('/sentences/get-hints', data),
  generateRandomResponse: (data) => apiClient.post('/sentences/generate-random', data) // Renamed from generate-random fetch
};

// Chatbot endpoints
export const chatbotAPI = {
  sendMessage: (data) => apiClient.post('/chatbot/message', data),
  translate: (text) => apiClient.post('/chatbot/message', {
    message: `Translate the following to Vietnamese. Output ONLY the translation, nothing else:\n"${text}"`,
    conversationHistory: []
  }),
  getHistory: (params) => apiClient.get('/chatbot/history', { params }),
  getSessionHistory: (sessionId) => apiClient.get(`/chatbot/history?sessionId=${sessionId}`),
  startSession: (data) => apiClient.post('/chatbot/session/start', data),
  endSession: (sessionId) => apiClient.post(`/chatbot/session/end`, { sessionId }),
  getSession: (sessionId) => apiClient.get(`/chatbot/session/${sessionId}`),
  deleteSession: (sessionId) => apiClient.delete(`/chatbot/session/${sessionId}`)
};

// Pronunciation endpoints
export const pronunciationAPI = {
  analyze: (data) => apiClient.post('/pronunciation/analyze', data),
  generate: (level) => apiClient.get(`/pronunciation/generate?level=${level}`)
};

// Roleplay endpoints
export const roleplayAPI = {
  startSession: (data) => apiClient.post('/roleplay/start', data),
  sendMessage: (sessionId, message) => apiClient.post('/roleplay/message', { sessionId, message }),
  endSession: (sessionId) => apiClient.post('/roleplay/end', { sessionId }),
  getScenarios: () => apiClient.get('/roleplay/scenarios') // Assuming this exists or hardcoded
};

// Folder Management endpoints
export const folderAPI = {
  getAll: () => apiClient.get('/folders'),
  create: (name) => apiClient.post('/folders', { name }),
  update: (id, name) => apiClient.put(`/folders/${id}`, { name }),
  delete: (id) => apiClient.delete(`/folders/${id}`),
  addWords: (folderId, wordIds) => apiClient.post('/folders/add-words', { folderId, wordIds }),
  removeWords: (folderId, wordIds) => apiClient.post('/folders/remove-words', { folderId, wordIds })
};

// Dashboard endpoints
export const dashboardAPI = {
  // Combined endpoint
  getAllData: () => apiClient.get('/dashboard/all'),

  // Individual endpoints (if needed)
  getOverview: () => apiClient.get('/dashboard/overview'),
  getGrammarProgress: () => apiClient.get('/dashboard/grammar-progress'),
  getVocabularyStats: () => apiClient.get('/dashboard/vocabulary-stats'),
  getSessionStats: () => apiClient.get('/dashboard/session-stats'),
  getWeeklyReport: () => apiClient.get('/dashboard/weekly-report'),
  getMonthlyReport: () => apiClient.get('/dashboard/monthly-report'),

  // Missions & Level
  getMissions: () => apiClient.get('/dashboard/missions'),
  claimMission: (missionId, xp) => apiClient.post('/dashboard/claim-mission', { missionId, xp })
};

// Admin endpoints
export const adminAPI = {
  // Users
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (data) => apiClient.post('/admin/users', data),
  updateUser: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),

  // API Keys
  getApiKeys: () => apiClient.get('/admin/api-keys'),
  createApiKey: (data) => apiClient.post('/admin/api-keys', data),
  updateApiKey: (id, data) => apiClient.put(`/admin/api-keys/${id}`, data),
  importApiKeys: (keys) => apiClient.post('/admin/api-keys/import', { keys }),
  getApiKeyStats: () => apiClient.get('/admin/api-keys/stats'),
  toggleApiKey: (keyId) => apiClient.put(`/admin/api-keys/${keyId}/toggle`),
  deleteApiKey: (keyId) => apiClient.delete(`/admin/api-keys/${keyId}`),
  testApiKey: (key) => apiClient.post('/admin/api-keys/test', { key }),
  testAllApiKeys: () => apiClient.post('/admin/api-keys/test-all'),
  activateBatchApiKeys: (ids) => apiClient.post('/admin/api-keys/activate-batch', { ids }),
  deleteBatchApiKeys: (ids) => apiClient.post('/admin/api-keys/delete-batch', { ids }),

  // Config
  getConfig: () => apiClient.get('/admin/config'),
  updateConfig: (key, value) => apiClient.put('/admin/config', { key, value }),

  // Server Logs
  getServerLogs: (params) => apiClient.get('/admin/logs', { params }),
  clearServerLogs: (params) => apiClient.delete('/admin/logs', { params })
};

export default apiClient;
