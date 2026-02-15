import create from 'zustand';
import { userAPI } from '../services/api';

export const useUserStore = create((set) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token, isAuthenticated: !!token });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true, error: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await userAPI.getProfile();
      const data = response.data;

      // Check success based on response structure
      if (data.success) {
        set({ user: data.user, isAuthenticated: true });
      } else {
        // Only wipe token if it's a legitimate auth failure
        localStorage.removeItem('token');
        set({ token: null, isAuthenticated: false, user: null });
      }
    } catch (error) {
      // Don't log out if the request was simply canceled (e.g. by our deduplication logic)
      if (error.code === 'ERR_CANCELED' || error.message === 'Duplicate request cancelled') {
        return;
      }

      console.error('Fetch user error:', error);
      // interceptor in api.js handles 401 redirect, 
      // but we clean up state here if profile fetch fails for other reasons
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        set({ token: null, isAuthenticated: false, user: null });
      }
    }
  },

  clearError: () => set({ error: null })
}));

export const useLearningStore = create((set) => ({
  // Grammar state
  tenses: [],
  selectedTense: null,
  grammarProgress: {},

  // Vocabulary state
  words: [],
  selectedTopic: 'food',
  vocabularyStats: {},

  // Sentence state
  sentences: [],
  currentSentence: null,

  // Actions
  setTenses: (tenses) => set({ tenses }),
  setSelectedTense: (tenseName) => set({ selectedTense: tenseName }),
  setGrammarProgress: (progress) => set({ grammarProgress: progress }),

  setWords: (words) => set({ words }),
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  setVocabularyStats: (stats) => set({ vocabularyStats: stats }),

  setSentences: (sentences) => set({ sentences }),
  setCurrentSentence: (sentence) => set({ currentSentence: sentence })
}));
