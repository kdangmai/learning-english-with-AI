import create from 'zustand';

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

      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set({ user: data.user, isAuthenticated: true });
        }
      } else {
        localStorage.removeItem('token');
        set({ token: null, isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set({ user: data.user, isAuthenticated: true });
        }
      } else {
        localStorage.removeItem('token');
        set({ token: null, isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Fetch user error:', error);
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
