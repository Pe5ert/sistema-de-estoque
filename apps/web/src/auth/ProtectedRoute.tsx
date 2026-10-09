import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import { Alert } from '../feedback';

export function SessionGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.isLoading) return <main className="auth-state" role="status"><span className="block-label">GAVYO ESTOQUE</span><h1>Verificando sessão…</h1></main>;
  if (auth.error && !auth.currentUser) return (
    <main className="auth-state">
      <span className="block-label">GAVYO ESTOQUE</span><h1>Não foi possível verificar sua sessão.</h1>
      <Alert tone="error" title="Servidor indisponível." action={{ label: 'Tentar novamente', run: auth.retry }}>Verifique a conexão com o servidor e tente novamente.</Alert>
    </main>
  );
  return <>{auth.error && <Alert tone="warning" title="Não foi possível atualizar sua sessão." action={{ label: 'Tentar novamente', run: auth.retry }}>Verifique a conexão. O preenchimento permanece aberto.</Alert>}{children}</>;
}

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return <SessionGate>{isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />}</SessionGate>;
}
