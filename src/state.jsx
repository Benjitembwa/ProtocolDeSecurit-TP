import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage, setCsrf } from './api';

const AuthContext = createContext(null);
const LabContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const useLab = () => useContext(LabContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const restore = useCallback(async () => {
    setLoading(true);
    setConnectionError('');
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setCsrf(data.csrfToken);
    } catch (error) {
      if (error.response?.status !== 401) setConnectionError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    restore();
    const clear = () => {
      setUser(null);
      setCsrf('');
    };
    window.addEventListener('sentinel:unauthorized', clear);
    return () => window.removeEventListener('sentinel:unauthorized', clear);
  }, [restore]);
  const login = async (values) => {
    const { data } = await api.post('/auth/login', values);
    setUser(data.user);
    setCsrf(data.csrfToken);
    setConnectionError('');
  };
  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setCsrf('');
  };
  const clear = () => {
    setUser(null);
    setCsrf('');
  };
  return (
    <AuthContext.Provider value={{ user, loading, connectionError, restore, login, logout, clear }}>
      {children}
    </AuthContext.Provider>
  );
}
export function LabProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    setRefreshing(true);
    try {
      const response = await api.get('/state');
      if (current === requestId.current) {
        setData(response.data);
        setError('');
      }
      return response.data;
    } catch (e) {
      if (current === requestId.current) setError(errorMessage(e));
      throw e;
    } finally {
      if (current === requestId.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
    const timer = window.setInterval(() => {
      if (!document.hidden && !lock.current) refresh().catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [refresh]);
  const mutate = async (url, payload = {}, method = 'post', message) => {
    if (lock.current) return null;
    lock.current = true;
    setPending(true);
    try {
      const response = await api.request({ url, method, data: payload });
      await refresh().catch(() =>
        toast.error('Action enregistrée ; actualisez pour afficher les dernières données.'),
      );
      if (message) toast.success(message);
      return response.data ?? { ok: true };
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <LabContext.Provider value={{ data, refresh, refreshing, error, pending, mutate }}>
      {children}
    </LabContext.Provider>
  );
}
