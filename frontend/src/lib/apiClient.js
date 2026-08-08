import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // session cookie auth, per backend design
});

// Centralized 401 handling: bounce to login rather than every page
// having to catch this individually.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
