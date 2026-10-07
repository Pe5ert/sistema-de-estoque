import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userRoles } from '@stock/shared';
import { z } from 'zod';
import { apiClient, ApiError, UNAUTHORIZED_EVENT } from '../lib/api';
import './auth.css';
import { useFeedback } from '../feedback';

const userSchema = z.object({
  id: z.string().uuid(), name: z.string(), email: z.string().email(), role: z.enum(userRoles),
});
export type CurrentUser = z.infer<typeof userSchema>;
const sessionKey = ['auth', 'me'] as const;

async function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser | null> {
  try {
    const response = await apiClient<unknown>('/auth/me', { signal });
    return userSchema.parse(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

interface AuthState {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  sessionExpired: boolean;
  retry: () => void;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { clear, notify } = useFeedback();
  const client = useQueryClient();
  const [sessionExpired, setSessionExpired] = useState(false);
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => getCurrentUser(signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
    retry: false,
  });

  useEffect(() => {
    const unauthorized = () => {
      if (client.getQueryData(sessionKey)) setSessionExpired(true);
      client.setQueryData(sessionKey, null);
      clear();
      // Clear private feature data whenever the server rejects a session.
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      client.getMutationCache().clear();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, unauthorized);
  }, [client, clear]);

  async function login(credentials: { email: string; password: string }) {
    await apiClient('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    await client.cancelQueries({ queryKey: sessionKey });
    const user = await client.fetchQuery({ queryKey: sessionKey, queryFn: ({ signal }) => getCurrentUser(signal), staleTime: 0 });
    if (!user) throw new ApiError(401);
    setSessionExpired(false);
  }

  async function logout() {
    await apiClient('/auth/logout', { method: 'POST' });
    await client.cancelQueries();
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    client.getMutationCache().clear();
    client.setQueryData(sessionKey, null);
    setSessionExpired(false);
    clear();
    notify({ tone: 'info', title: 'Você saiu do sistema.' });
  }

  return <AuthContext.Provider value={{
    currentUser: session.data ?? null,
    isLoading: session.isPending,
    isAuthenticated: Boolean(session.data),
    error: session.error,
    sessionExpired,
    retry: () => { void session.refetch(); },
    login, logout,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider ausente.');
  return auth;
}
