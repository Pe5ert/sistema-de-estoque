import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

export function SessionGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.isLoading) return <main className="auth-state" role="status"><span className="block-label">ESTOQUE V2</span><h1>Verificando sessão…</h1></main>;
  if (auth.error) return (
    <main className="auth-state">
      <span className="block-label">ESTOQUE V2</span><h1>Não foi possível verificar sua sessão.</h1>
      <p role="alert">Verifique a conexão com o servidor e tente novamente.</p>
      <button className="auth-submit" onClick={auth.retry} type="button">Tentar novamente</button>
    </main>
  );
  return children;
}

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return <SessionGate>{isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />}</SessionGate>;
}
