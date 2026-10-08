import type { ReactNode } from 'react';
import { hasPermission, type Permission } from '@stock/shared';
import { Link } from 'react-router-dom';
import { useAuth } from './auth';
import { Alert } from '../feedback';

export function PermissionRoute({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!hasPermission(currentUser?.role, permission)) return (
    <Alert tone="warning" title="Você não tem permissão para acessar esta área.">
      <p>Se precisar desse acesso, fale com o administrador.</p>
      <Link className="secondary-button" to="/products">Voltar aos produtos</Link>
    </Alert>
  );
  return children;
}
