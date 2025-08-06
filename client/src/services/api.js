import axios from 'axios';

// Create axios instance with base configuration
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('keepnotes_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and token expiration
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('keepnotes_token');
      localStorage.removeItem('keepnotes_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
};

// Notes API calls
export const notesAPI = {
  getAllNotes: (params = {}) => API.get('/notes', { params }),
  getNote: (id) => API.get(`/notes/${id}`),
  createNote: (noteData) => API.post('/notes', noteData),
  updateNote: (id, noteData) => API.put(`/notes/${id}`, noteData),
  deleteNote: (id) => API.delete(`/notes/${id}`),
  pinNote: (id) => API.post(`/notes/${id}/pin`),
  archiveNote: (id) => API.post(`/notes/${id}/archive`),
  getStats: () => API.get('/notes/stats'),
};

// User API calls
export const userAPI = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (profileData) => API.put('/users/profile', profileData),
  changePassword: (passwordData) => API.post('/users/change-password', passwordData),
  getDashboard: () => API.get('/users/dashboard'),
  deactivateAccount: () => API.delete('/users/account'),
};

// Helper functions for token management
export const tokenManager = {
  setToken: (token) => {
    localStorage.setItem('keepnotes_token', token);
  },
  getToken: () => {
    return localStorage.getItem('keepnotes_token');
  },
  removeToken: () => {
    localStorage.removeItem('keepnotes_token');
    localStorage.removeItem('keepnotes_user');
  },
  setUser: (user) => {
    localStorage.setItem('keepnotes_user', JSON.stringify(user));
  },
  getUser: () => {
    const user = localStorage.getItem('keepnotes_user');
    return user ? JSON.parse(user) : null;
  },
};

export default API;
