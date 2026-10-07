import { useState } from 'react';
import { useFeedback } from '../feedback';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import type { UserRole } from '@stock/shared';
import { ApiError } from '../lib/api';
import { useAuth } from './auth';

const roleLabels: Record<UserRole, string> = { ADMIN: 'Administrador', MANAGER: 'Gerente', OPERATOR: 'Operador' };

export function UserSession() {
  const { currentUser, logout } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!currentUser) return null;

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      notify({ tone: 'error', title: 'Não foi possível sair.', description: error instanceof ApiError ? error.message : 'Tente novamente.', key: 'logout' });
    } finally {
      setBusy(false);
    }
  }

  return <div className="user-session">
    <span className="user-session-name">{currentUser.name}<small>{roleLabels[currentUser.role]}</small></span>
    <button type="button" onClick={signOut} disabled={busy}><LogOut size={16} aria-hidden="true" />{busy ? 'Saindo…' : 'Sair'}</button>
  </div>;
}
