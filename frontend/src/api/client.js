import axios from 'axios';

// Create Axios client pointing to the backend Express server
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Send httpOnly cookies (JWT token) with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
