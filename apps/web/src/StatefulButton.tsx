import * as React from 'react';
import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
export type ActionState = 'idle' | 'loading' | 'success' | 'error';
export function StatefulButton({ state = 'idle', loadingLabel = 'Processando…', successLabel = 'Salvo', errorLabel = 'Tentar novamente', children, disabled, className = 'primary-button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { state?: ActionState; loadingLabel?: string; successLabel?: string; errorLabel?: string }) {
  return <button {...props} className={className + ' stateful-button'} data-state={state} disabled={disabled || state === 'loading'} aria-busy={state === 'loading'}>
    {state === 'loading' ? <LoaderCircle className="stateful-spinner" size={16} aria-hidden="true" /> : state === 'success' ? <Check size={16} aria-hidden="true" /> : state === 'error' ? <CircleAlert size={16} aria-hidden="true" /> : null}
    <span>{state === 'loading' ? loadingLabel : state === 'success' ? successLabel : state === 'error' ? errorLabel : children}</span>
  </button>;
}
