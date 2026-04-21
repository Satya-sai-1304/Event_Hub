import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add user role and ID for basic RBAC
api.interceptors.request.use((config) => {
  const user = sessionStorage.getItem('auth-user');
  if (user) {
    const userData = JSON.parse(user);
    config.headers['x-user-role'] = userData.role;
    config.headers['x-user-id'] = userData.id || userData._id;
  }
  return config;
});

export default api;
