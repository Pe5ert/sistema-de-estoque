const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const UNAUTHORIZED_EVENT = 'stock:unauthorized';

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(status === 0 || status === 503
      ? 'Não foi possível conectar ao servidor.'
      : status === 429
        ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
        : 'Não foi possível concluir a solicitação. Tente novamente.');
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0);
  }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status);
  }
  if (response.status === 204) return undefined as T;
  try {
    return await response.json() as T;
  } catch {
    throw new ApiError(500);
  }
}
