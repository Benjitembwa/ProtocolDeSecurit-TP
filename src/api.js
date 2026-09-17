import axios from 'axios';

let csrfToken = '';
export const setCsrf = (value) => {
  csrfToken = value || '';
};
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 });
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method)) config.headers['X-CSRF-Token'] = csrfToken;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/'))
      window.dispatchEvent(new Event('sentinel:unauthorized'));
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  error.response?.data?.details?.map((d) => d.message).join(' ') ||
  error.response?.data?.error ||
  (error.code === 'ECONNABORTED'
    ? 'Le serveur met trop de temps à répondre. Réessayez.'
    : 'Connexion au serveur impossible. Vérifiez que l’API est démarrée.');
