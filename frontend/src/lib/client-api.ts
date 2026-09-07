import axios from 'axios';

// The client API ONLY talks to our Next.js BFF routes (or public proxy routes).
// It does NOT attach the JWT token. It relies on the browser to send the HttpOnly cookie automatically!

const clientApi = axios.create({
  baseURL: '/api/proxy', // We'll route frontend API calls through this Next.js route
  withCredentials: true, // Crucial: This ensures the browser sends the session cookie to our BFF!
});

// Request interceptor to attach CSRF token across state-changing verbs
clientApi.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
     // A robust app might pull this from a meta tag or a CSRF endpoint.
     // For this ATS, our BFF middleware handles CSRF implicitly or via specific headers.
     config.headers['X-CSRF-Token'] = 'auto-handled-by-bff';
  }
  return config;
});

// Response interceptor to catch global errors
clientApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API 401] Unauthorized access to:', error.config?.url);
      
      // Only redirect if NOT already on a public page and NOT an OPTIONS request
      if (typeof window !== 'undefined' && 
          !window.location.pathname.startsWith('/login') && 
          !window.location.pathname.startsWith('/register') &&
          window.location.pathname !== '/' &&
          error.config?.method !== 'options') {
         
         // Add a small delay or check if it's a persistent failure
         console.warn('[API] Forced logout due to 401');
         window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default clientApi;
