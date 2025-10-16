import apiService from './ApiService';

// config sample
export const userApi = {
  getUsers: () => apiService.get('/users'),
  getUserById: (id: string) => apiService.get(`/users/${id}`),
};
