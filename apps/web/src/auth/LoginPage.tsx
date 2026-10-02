import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from './auth';
import { SessionGate } from './ProtectedRoute';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.').max(180, 'Use até 180 caracteres.'),
  password: z.string().min(1, 'Informe sua senha.').max(128, 'Use até 128 caracteres.'),
});

export function LoginPage() {
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, resetField, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (credentials) => {
    setError(null);
    try {
      await auth.login(credentials);
    } catch (error) {
      setError(error instanceof ApiError
        ? error.status === 401 ? 'E-mail ou senha inválidos.' : error.message
        : 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      resetField('password');
    }
  });

  return <SessionGate>{auth.isAuthenticated ? <Navigate to="/" replace /> : (
    <main className="login-page">
      <div className="login-workspace">
        <header className="login-topbar">
          <div className="brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span className="brand-wordmark">ESTOQUE<span>V2</span></span></div>
          <span className="login-restricted"><LockKeyhole size={14} aria-hidden="true" /> Acesso restrito à equipe</span>
        </header>
        <div className="login-body">
          <section className="login-identity" aria-label="Controle de estoque">
            <div className="login-identity-main"><span className="block-label">ÁREA DE TRABALHO</span><h1>Controle<br /> de estoque<span className="login-period">.</span></h1><p>Disponibilidade e rastreabilidade<br />na sua operação.</p></div>
            <ul className="login-operation-list" aria-label="Áreas do sistema">
              <li><span>01</span><div><strong>Produtos</strong><small>Identificação e disponibilidade</small></div></li>
              <li><span>02</span><div><strong>Movimentações</strong><small>Entradas, saídas e ajustes</small></div></li>
              <li><span>03</span><div><strong>Histórico</strong><small>Rastreabilidade de saldo</small></div></li>
            </ul>
          </section>
          <section className="login-access" aria-labelledby="login-title">
            <div className="login-access-inner">
              <div className="login-access-heading"><div className="login-kicker"><LockKeyhole size={16} aria-hidden="true" /><span>IDENTIFICAÇÃO</span></div>
              <h2 id="login-title">Entrar no sistema</h2><p className="login-description">Use seu e-mail e senha para acessar a operação.</p></div>
              {auth.sessionExpired && <p className="login-notice" role="status">Sua sessão expirou ou foi encerrada. Entre novamente.</p>}
              <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
                <div className="auth-field">
                  <label htmlFor="login-email">E-mail <span>Seu acesso à equipe</span></label>
                  <input id="login-email" type="email" autoComplete="username" inputMode="email" maxLength={180}
                    aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
                  {errors.email && <p className="auth-field-error" id="email-error">{errors.email.message}</p>}
                </div>
                <div className="auth-field">
                  <label htmlFor="login-password">Senha <span>Credencial pessoal</span></label>
                  <div className="auth-password">
                    <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={128}
                      aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
                    <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}
                      onClick={() => setShowPassword((show) => !show)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  {errors.password && <p className="auth-field-error" id="password-error">{errors.password.message}</p>}
                </div>
                {error && <p className="auth-form-error" role="alert">{error}</p>}
                <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar'}<ArrowRight size={19} aria-hidden="true" /></button>
              </form>
              <p className="login-session-note"><LockKeyhole size={14} aria-hidden="true" /><span>Sessão de até 8 horas.<br />Use Sair ao encerrar sua operação.</span></p>
            </div>
          </section>
        </div>
        <footer className="login-footer"><span>CONTROLE OPERACIONAL / ESTOQUE V2</span><span>ACESSO COM CREDENCIAIS DA EQUIPE</span></footer>
      </div>
    </main>
  )}</SessionGate>;
}
