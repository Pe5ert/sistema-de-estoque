import * as React from 'react';
import { invalidPeriod, periodDates } from './period-model';
import { FieldError } from './feedback';
export function PeriodSelector({ from, to, change }: { from: string; to: string; change: (from: string, to: string) => void }) {
  const id = React.useId(), input = React.useRef<HTMLInputElement>(null);
  const invalid = invalidPeriod(from, to);
  return <fieldset className="period-selector"><legend>Período <small>Horário de Brasília</small></legend>
    <div className="period-presets">{[1, 7, 30, 90].map(days => { const range = periodDates(days); return <button type="button" key={days} className="text-button" aria-pressed={from === range.from && to === range.to} onClick={() => change(range.from, range.to)}>{days === 1 ? 'Hoje' : `${days} dias`}</button>; })}<button type="button" className="text-button" onClick={() => input.current?.focus()}>Personalizado</button>{(from || to) && <button type="button" className="text-button" onClick={() => change('', '')}>Todo o histórico</button>}</div>
    <div className="date-range"><label className="select-control"><span>De</span><input ref={input} type="date" min="0001-01-01" max="9999-12-31" value={from} aria-invalid={invalid} aria-describedby={invalid ? id : undefined} onChange={event => change(event.target.value, to)} /></label><label className="select-control"><span>Até</span><input type="date" min="0001-01-01" max="9999-12-31" value={to} aria-invalid={invalid} aria-describedby={invalid ? id : undefined} onChange={event => change(from, event.target.value)} /></label></div>
    {invalid && <FieldError id={id}>Informe datas válidas, com a data final igual ou posterior à inicial.</FieldError>}
  </fieldset>;
}
