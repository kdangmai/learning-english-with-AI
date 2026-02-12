import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
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

// Auth endpoints
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
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
  completeTense: (tenseName) => apiClient.post('/grammar/complete-tense', { tenseName })
};

// Vocabulary endpoints
export const vocabularyAPI = {
  getTopics: () => apiClient.get('/vocabulary/topics'),
  getWordsByTopic: (topic) => apiClient.get(`/vocabulary/by-topic/${topic}`),
  getWordsByStatus: (status) => apiClient.get(`/vocabulary/by-status/${status}`),
  addWord: (data) => apiClient.post('/vocabulary/add', data),
  updateWord: (wordId, data) => apiClient.put(`/vocabulary/${wordId}`, data),
  reviewWord: (data) => apiClient.post('/vocabulary/review', data),
  getFlashcards: () => apiClient.get('/vocabulary/flashcards'),
  generateFlashcards: (topic) => apiClient.post('/vocabulary/generate-flashcards', { topic }),
  // Apply action on a word from flashcard: { action: 'learned'|'add'|'skip' }
  applyAction: (wordId, body) => apiClient.post(`/vocabulary/${wordId}/action`, body)
};

// Sentence endpoints
export const sentenceAPI = {
  submitSentence: (data) => apiClient.post('/sentences/submit', data),
  gradeSentence: (data) => apiClient.post('/sentences/grade', data),
  upgradeSentence: (data) => apiClient.post('/sentences/upgrade', data),
  getHistory: () => apiClient.get('/sentences/history'),
  getSentence: (sentenceId) => apiClient.get(`/sentences/${sentenceId}`),
  getHints: (data) => apiClient.post('/sentences/get-hints', data)
};

// Chatbot endpoints
export const chatbotAPI = {
  sendMessage: (data) => apiClient.post('/chatbot/message', data),
  translate: (text) => apiClient.post('/chatbot/message', {
    message: `Translate the following to Vietnamese. Output ONLY the translation, nothing else:\n"${text}"`,
    conversationHistory: []
  }),
  getHistory: () => apiClient.get('/chatbot/history'),
  startSession: (data) => apiClient.post('/chatbot/session/start', data),
  endSession: (sessionId) => apiClient.post(`/chatbot/session/end`, { sessionId })
};

// Dashboard endpoints
export const dashboardAPI = {
  getOverview: () => apiClient.get('/dashboard/overview'),
  getGrammarProgress: () => apiClient.get('/dashboard/grammar-progress'),
  getVocabularyStats: () => apiClient.get('/dashboard/vocabulary-stats'),
  getSessionStats: () => apiClient.get('/dashboard/session-stats'),
  getWeeklyReport: () => apiClient.get('/dashboard/weekly-report'),
  getMonthlyReport: () => apiClient.get('/dashboard/monthly-report')
};

export default apiClient;
