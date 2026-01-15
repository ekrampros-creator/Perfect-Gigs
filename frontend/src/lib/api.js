import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  getMe: () => api.get('/auth/me'),
};

// Profile
export const profileAPI = {
  update: (data) => api.put('/profile', data),
  get: (userId) => api.get(`/profile/${userId}`),
  registerFreelancer: (data) => api.post('/freelancer/register', data),
};

// Gigs
export const gigsAPI = {
  create: (data) => api.post('/gigs', data),
  list: (params) => api.get('/gigs', { params }),
  get: (gigId) => api.get(`/gigs/${gigId}`),
  apply: (gigId, data) => api.post(`/gigs/${gigId}/apply`, data),
  getApplications: (gigId) => api.get(`/gigs/${gigId}/applications`),
  acceptApplication: (applicationId) => api.put(`/applications/${applicationId}/accept`),
  getMyGigs: () => api.get('/my-gigs'),
  getMyApplications: () => api.get('/my-applications'),
};

// Matching
export const matchAPI = {
  getGigs: () => api.get('/match/gigs'),
  getFreelancers: (gigId) => api.get(`/match/freelancers/${gigId}`),
};

// Messages
export const messagesAPI = {
  send: (data) => api.post('/messages', data),
  getConversation: (otherUserId) => api.get(`/messages/${otherUserId}`),
  getConversations: () => api.get('/conversations'),
};

// Reviews
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getForUser: (userId) => api.get(`/reviews/${userId}`),
};

// AI
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
};

// Misc
export const miscAPI = {
  getCategories: () => api.get('/categories'),
  getStats: () => api.get('/stats'),
};

export default api;
