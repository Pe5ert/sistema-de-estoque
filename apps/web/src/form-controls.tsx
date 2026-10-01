import type { ReactNode, Ref } from 'react';
import { Minus, Plus } from 'lucide-react';
import { editableNumber, parseDecimal } from './product-form-model';

export function Field({ id, label, hint, error, required, children }: {
  id: string; label: string; hint?: string; error?: string; required?: boolean; children: ReactNode;
}) {
  return <div className={'form-field' + (error ? ' form-field-invalid' : '')}>
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{children}
    {hint && <span className="field-hint" id={id + '-hint'}>{hint}</span>}
    {error && <span className="field-error" id={id + '-error'}>{error}</span>}
  </div>;
}

export function fieldAccessibility(id: string, error?: string, hasHint = false) {
  return { 'aria-invalid': Boolean(error), 'aria-describedby': [hasHint ? id + '-hint' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined };
}

export function QuantityInput({ id, value, onChange, onBlur, unit, error, disabled, inputRef }: {
  id: string; value: string; onChange: (value: string) => void; onBlur?: () => void;
  unit: string; error?: string; disabled?: boolean; inputRef?: Ref<HTMLInputElement>;
}) {
  const numeric = parseDecimal(value, 3);
  return <div className="quantity-control form-quantity">
    <button type="button" disabled={disabled || numeric === null || numeric <= 1} aria-label="Diminuir quantidade" onClick={() => onChange(editableNumber(Math.max(0, (numeric ?? 0) - 1)))}><Minus size={16} aria-hidden="true" /></button>
    <input id={id} ref={inputRef} type="text" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} disabled={disabled} {...fieldAccessibility(id, error)} />
    <span className="quantity-unit" aria-hidden="true">{unit}</span>
    <button type="button" disabled={disabled} aria-label="Aumentar quantidade" onClick={() => onChange(editableNumber(Math.round(((numeric ?? 0) + 1) * 1000) / 1000))}><Plus size={16} aria-hidden="true" /></button>
  </div>;
}
