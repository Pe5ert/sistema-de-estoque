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
      <section className="login-identity" aria-label="Controle de estoque">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span className="brand-wordmark">ESTOQUE<span>V2</span></span></div>
        <div className="login-identity-main"><span className="block-label">CONTROLE OPERACIONAL</span><h1>Controle<br /> de estoque<span className="login-period">.</span></h1><p>Disponibilidade e rastreabilidade<br />na sua área de trabalho.</p></div>
        <div className="login-identity-footer"><span>ACESSO RESTRITO</span><span>OPERAÇÃO / ESTOQUE</span></div>
      </section>
      <section className="login-access" aria-labelledby="login-title">
        <div className="login-access-inner">
          <div className="login-kicker"><LockKeyhole size={18} aria-hidden="true" /><span>IDENTIFICAÇÃO</span></div>
          <h2 id="login-title">Acesse sua operação</h2><p className="login-description">Entre com as credenciais da sua equipe.</p>
          {auth.sessionExpired && <p className="login-notice" role="status">Sua sessão expirou ou foi encerrada. Entre novamente.</p>}
          <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
            <div className="auth-field">
              <label htmlFor="login-email">E-mail</label>
              <input id="login-email" type="email" autoComplete="username" inputMode="email" maxLength={180}
                aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
              {errors.email && <p className="auth-field-error" id="email-error">{errors.email.message}</p>}
            </div>
            <div className="auth-field">
              <label htmlFor="login-password">Senha</label>
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
          <p className="login-session-note">Sessão de até 8 horas. Use Sair ao encerrar sua operação.</p>
        </div>
      </section>
    </main>
  )}</SessionGate>;
}
