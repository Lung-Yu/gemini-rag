import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const getHealth = async () => {
  const response = await api.get('/');
  return response.data;
};

// Chat
export const sendMessage = async (message) => {
  const response = await api.post('/api/chat', { message });
  return response.data;
};

// Files
export const listFiles = async () => {
  const response = await api.get('/api/files');
  return response.data;
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteFile = async (fileName) => {
  const response = await api.delete(`/api/files/${fileName}`);
  return response.data;
};

export const clearAllFiles = async () => {
  const response = await api.delete('/api/files');
  return response.data;
};

export default api;
